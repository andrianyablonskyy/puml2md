/**
 * Update any markdown links in a specified directory which reference a PUML diagram so they link directly to a
 * puml server svg link. This is required for GitHub integration
 * NOTE: Does not support cyclic dependencies, only DAGS
 */

const fs = require('fs'),
  path = require('path'),
  assert = require('assert'),
  zlib = require('zlib'),
  bent = require('bent'),
  Promise = require('bluebird'),
  _ = require('lodash'),
  glob = require('glob'),
  plantUmlEncoder = require('plantuml-encoder'),
  tiny = require('tinyurl'),
  parseGitIgnore = require('gitignore-globs');

// HELPERS
const mkdirIfDoesntExist = (p) => !fs.existsSync(p) && fs.mkdirSync(p, { recursive: true }),
  getPumlUrl = ({ imgFormat, encodedData, shorten, pumlServerUrl }) =>
    shorten ? tiny.shorten(getFullPumlUrl({ pumlServerUrl, imgFormat, encodedData })) : getFullPumlUrl({ pumlServerUrl, imgFormat, encodedData }),
  getFullPumlUrl = ({ pumlServerUrl, imgFormat, encodedData }) => `${pumlServerUrl}/${imgFormat}/${encodedData}`,
  mapUniqMatches = (s, re, mapper, match = re.exec(s), results = []) => {
    if (match){
      return mapUniqMatches(s, re, mapper, re.exec(s), results.concat([match]));
    }
    return _.uniqBy(results, String).map(mapper);
  },

  replaceIgnore = (ignoreRegex, str, replaceFn) => {
    const splitRegex = new RegExp(`(?:(${ignoreRegex}))`, 'g'),
      splitStrArr = str.split(splitRegex),
      replacedSplitStrArr = splitStrArr.map((splitStr) => {
        if (splitStr.match(new RegExp(ignoreRegex))){
          return splitStr;
        }
        return replaceFn(splitStr);
      });
    return replacedSplitStrArr.join('');
  },

  replaceMdIgnoringInlineCode = (mdString, replaceFn) => {
    return replaceIgnore('`[^\n]*?(?=`)`', mdString, replaceFn);
  },

  replaceMdIgnoringCodeBlocks = (mdString, replaceFn) => {
    return replaceIgnore('```[\\s\\S]*?(?=```)```', mdString, replaceFn);
  },

  replaceMdIgnoringCode = (mdString, replaceFn) => {
    return replaceMdIgnoringCodeBlocks(mdString, (str) => replaceMdIgnoringInlineCode(str, replaceFn));
  };

// DATA STRUCTURES

class PumlLinks extends Map{
  constructor({ pumlPaths, shouldShortenLinks, pumlServerUrl }){
    super();
    this.shouldShortenLinks = shouldShortenLinks;
    this.pumlServerUrl = pumlServerUrl;
    // We need to know which paths should be visited
    // Any path that's not marked 0 we know isn't a puml path because it doesn't correspond to a puml file
    pumlPaths.forEach((p) => this.set(p, 0));
  }

  get(p){
    return super.get(p);
  }

  async set(pumlPath, v){
    if (typeof v === 'number'){
      return super.set(pumlPath, v);
    }

    const encodedData = plantUmlEncoder.encode(v),
      url = await getPumlUrl({
        imgFormat: 'svg',
        encodedData,
        shorten: this.shouldShortenLinks,
        pumlServerUrl: this.pumlServerUrl
      });
    return super.set(pumlPath, { encodedData, url, data: v });
  }

  has(pumlPath){
    return super.has(pumlPath);
  }
}

// SAVING DIAGRAMS

const downloadImg = async (serverUrl, imgUrl, outputPath) => {
    const getStream = bent(serverUrl);
    let imgBuffer = null;
    try {
      const stream = await getStream(imgUrl);
      imgBuffer = await stream.text();
    }
    catch (e){
      if (e.statusCode !== 400){
        console.warn(`WARN: Failed to save ${serverUrl}${imgUrl} to ${outputPath}\n`);
        console.log(`Error: ${e.message}`);
        throw e;
      }

      imgBuffer = await e.text();
    }

    fs.writeFileSync(outputPath, imgBuffer);

    if (!fs.existsSync(outputPath)){
      console.error(`Diagram could not be saved to ${outputPath}`);
      console.log(`Buffered data: ${imgBuffer}`);
    }
  },

  saveDiagram = async ({ rootDirectory, distDirectory, pumlPath, imgFormat, encodedData, pumlServerUrl }) => {
    const outputPath = path.join(distDirectory, pumlPath.replace(rootDirectory, '').replace(/\.puml$/, `.${imgFormat}`)),
      relFilePath = outputPath.replace(rootDirectory, '.');

    mkdirIfDoesntExist(path.dirname(outputPath));
    const imgUrl = `/${imgFormat}/${encodedData}`;
    await downloadImg(pumlServerUrl, imgUrl, outputPath);

    return relFilePath;
  },

  saveDiagrams = async ({ rootDirectory, distDirectory, imageFormats, pumlLinks, pumlServerUrl }) => {
    fs.rmSync(distDirectory, { recursive: true, force: true });
    diagramsMap = {};
    for (const [pumlPath, { encodedData }]of pumlLinks){
      for (const imgFormat of imageFormats){
        if (!diagramsMap[imgFormat]){
          diagramsMap[imgFormat] = {};
        }

        const file = await saveDiagram({
          distDirectory,
          rootDirectory,
          pumlPath,
          imgFormat,
          encodedData,
          pumlServerUrl
        });

        diagramsMap[imgFormat][pumlPath] = file;
      }
    }

    return diagramsMap;
  },

  // PROCESSORS

  /**
 * Add the whole relative includes file into the puml instead of a reference
 * @returns {string} The puml data where relative includes are replaced with the data from referenced file
 */
  processIncludes = (pumlPath, data) => {
    return data.replace(/!include (.*)/g, (fullMatch, url) => {
      const fullUrl = path.resolve(path.dirname(pumlPath), url);
      return fs.existsSync(fullUrl) ? fs.readFileSync(fullUrl, 'utf8') : fullMatch;
    });
  },

  /**
 * Walk through each PUML file recursively so we can encode any linked files first since the files they link
 * from are dependent
 * @returns {Promise<string> | Promise<undefined>} Returns either processed puml file link, or original link
 */
  processPumlFile = async (pumlPath, pumlLinks) => {
  // Base Cases
    if (!pumlLinks.has(pumlPath)){
      return pumlPath;
    }
    if (pumlLinks.get(pumlPath)){
      return pumlLinks.get(pumlPath);
    }

    let data = fs.readFileSync(pumlPath, 'utf8');
    await Promise.all(
      mapUniqMatches(data, /\$link=["']([^"']+)['"]/gm, async ([pumlLink, pumlLinkPath]) => {
      // console.debug(pumlLink, pumlLinkPath)
        const newLink = await processPumlFile(path.resolve(path.dirname(pumlPath), pumlLinkPath), pumlLinks);
        data = data.replaceAll(pumlLink, `$link="${newLink.url}"`);
      })
    );

    data = processIncludes(pumlPath, data);
    await pumlLinks.set(pumlPath, data);
    return pumlLinks.get(pumlPath);
  },

  /**
 * Update any markdown links which reference PUML diagram so they link directly to a puml server svg link
 * Output them as new markdown in the docs directory
 */
  processMdFile = async (mdPath, pumlLinks, embed, diagramMap) => {
    console.info(`Processing md file at ${mdPath}`);
    const originalMdStr = fs.readFileSync(mdPath, 'utf8'),
      findMdPumlLinksRE = new RegExp('((\\[.*\\]\\([^)]+\\)|<img\\s+.*\\/>)*)?<!\-\-(!?\\[[^\\]]+\\])\\(([^)]+\\.puml)\\)\-\->', 'g'),
      // Add puml server tinyurl link for puml links indicated in markdown comments
      mdWithUpdatedPumlLinks = replaceMdIgnoringCode(originalMdStr, (str) => {
        return str.replace(findMdPumlLinksRE, (match, g1, g2, linkText, mdPumlLinkPath) => {
          const pumlPath = path.resolve(path.dirname(mdPath), mdPumlLinkPath),
            pumlLink = pumlLinks.get(pumlPath);
          if (!pumlLink){
            throw Error(`Could not find puml for md link path = ${mdPumlLinkPath}, absolute path = ${pumlPath}`);
          }

          let replacement;
          // If the puml link is a markdown image
          if (linkText[0] === '!'){
            if (embed){
              altText = linkText.slice(2, -1).trim(); // Remove the ! and the trailing space
              svg = diagramMap['svg'];

              if (!fs.existsSync(svg[pumlPath])){
                console.error(`Diagram file '${svg[pumlPath]}' does not exists`);
              }

              replacement = `<img class="puml-diagram" alt="${altText}" src="${svg[pumlPath]}" /><!--${linkText}(${mdPumlLinkPath})-->`;
            }
            else {
              replacement = `[${linkText}(${pumlLink.url})](${pumlLink.url})<!--${linkText}(${mdPumlLinkPath})-->`;
            }
          }
          else {
            // If the puml link is a markdown hyperlink
            replacement = `${linkText}(${pumlLink.url})<!--${linkText}(${mdPumlLinkPath})-->`;
          }

          // console.debug({match, linkText, mdPumlLinkPath, replacement})
          return replacement;
        });
      });

    fs.writeFileSync(mdPath, mdWithUpdatedPumlLinks);
  },

  runOnce = async ({
    pumlServerUrl,
    embed,
    rootDirectory,
    markdownDirectory,
    pumlDirectory,
    distDirectory,
    outputImages,
    imageFormats,
    respectGitignore,
    gitignorePath,
    shouldShortenLinks
  }) => {
    assert(fs.existsSync(markdownDirectory), 'That\'s an invalid md folder path');
    assert(fs.existsSync(pumlDirectory), 'That\'s an invalid puml folder path');

    const ignore = respectGitignore ? parseGitIgnore(gitignorePath) : [],
      mdPaths = glob.sync(`${markdownDirectory}/**/*.md`, { ignore, nodir: true }),
      pumlPaths = glob.sync(`${pumlDirectory}/**/*.puml`, { ignore, nodir: true }),
      pumlLinks = new PumlLinks({pumlPaths, shouldShortenLinks, pumlServerUrl});

    let diagramMap = {};

    for (const p of pumlPaths){
      await processPumlFile(p, pumlLinks);
    }

    if (outputImages){
      diagramMap = await saveDiagrams({ rootDirectory, distDirectory, imageFormats, pumlLinks, pumlServerUrl});
    }

    for (const p of mdPaths){
      await processMdFile(p, pumlLinks, embed, diagramMap);
    }
  },

  reloadRun = ({ intervalSeconds, ...rest }) =>
    Promise.delay(intervalSeconds * 1000, rest)
      .then(run)
      .catch(console.error)
      .finally(() => reloadRun({ intervalSeconds, ...rest })),

  run = ({ hotReload, ...rest }) => (hotReload ? reloadRun(rest) : runOnce(rest));

module.exports = run;
