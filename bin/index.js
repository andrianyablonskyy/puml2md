#!/usr/bin/env node

const path = require('path'),
  fs = require('fs'),

  {Command, Option} = require('commander'),

  run = require(path.resolve(__dirname, '../index.js'));

// =============
// = CLI Setup =
// =============

new Command()
  .description('An application to add interactive PUML diagrams to your github markdown files. '
    + 'If running with default arguments, run in project root directory.')
  .option(
    '-s, --puml-server-url <url>',
    'This is the base URL used to render diagrams. Defaults to the public plantuml server.'
  )
  .addOption(new Option(
    '-x, --root-directory <path>',
    'The path to your project'
  ).default(process.cwd(), 'CWD')
  )
  .option(
    '-e, --embed',
    'Embed the puml diagrams in the markdown files, instead of linking to them',
    false
  )
  .option(
    '-r, --hot-reload',
    'Rerun markdown generator every `interval` seconds, determined by interval option'
  )
  .option(
    '-v, --interval-seconds <number>',
    'If --hot-reload is set, how often should it reload',
    2
  )
  .addOption(new Option(
    '-p, --puml-directory <path>',
    'Path to directory containing puml files which are referenced in markdown files'
  ).default(false, 'rootDirectory')
  )
  .addOption(new Option(
    '-m, --markdown-directory <path>',
    'Path to directory containing markdown files referencing puml files'
  ).default(false, 'rootDirectory')
  )
  .option(
    '-g, --ignore-gitignore',
    'Don\'t use .gitignore to skip PUML and MD. Will automatically be true if no gitignore is found'
  )
  .addOption(new Option(
    '-i, --gitignore-path <path>',
    'Use this as path to .gitignore file.'
  ).default(false, 'rootDirectory/.gitignore')
  )
  .option(
    '-d, --output-images',
    'If set, will output images of diagrams to the dist directory'
  )
  .addOption(new Option(
    '-b, --dist-directory <path>',
    'If --output-images is set, path to output diagram images'
  ).default(false, 'rootDirectory/dist_puml')
  )
  .addOption(new Option(
    '-f, --image-formats <format>',
    'If --output-images is set, sets the output image format'
  ).choices(['png', 'svg', 'both']).default('png')
  )
  .option(
    '-t, --turn-off-link-shortening',
    'Use the full puml server link instead of the tiny url, if your diagrams are too big this won\'t work'
  )
  .action((opts) => {
    const useDefaultGitignorePath = !opts.gitignorePath;

    opts.embed = opts.embed || false;
    opts.distDirectory = opts.distDirectory || path.resolve(opts.rootDirectory, 'dist_puml');
    opts.gitignorePath = opts.gitignorePath || path.resolve(opts.rootDirectory, '.gitignore');
    opts.markdownDirectory = opts.markdownDirectory || opts.rootDirectory;
    opts.pumlDirectory = opts.pumlDirectory || opts.rootDirectory;
    opts.shouldShortenLinks = !opts.turnOffLinkShortening;
    opts.respectGitignore = !opts.ignoreGitignore;
    opts.imageFormats = opts.imageFormats === 'both' ? ['png', 'svg'] : [opts.imageFormats];

    // If a gitignore path wasn't specified, don't try and parse it
    if (useDefaultGitignorePath && !fs.existsSync(opts.gitignorePath)){
      opts.respectGitignore = false;
    }

    if (opts.embed){
      opts.pumlServerUrl = opts.pumlServerUrl || 'http://localhost:8080'; // If embedding, use a local server
      opts.imageFormats = ['svg']; // If embedding, only use svg
      opts.outputImages = true;
      opts.shouldShortenLinks = true; // If embedding, shorten links to the puml server. Require for downloading images
    }
    else {
      opts.pumlServerUrl = opts.pumlServerUrl || 'https://www.plantuml.com/plantuml';
    }

    return run(opts).catch((e) => {
      console.error('FATAL EXCEPTION');
      console.error(e);
    });
  })
  .parse(process.argv);
