## Svelte slides

A basic setup for browser based presentations using Svelte.

### Credits

This codebase was started based on <a href="https://github.com/pngwn/bristech-2019">pngwn's work for Bristech 2019 presentation</a>. I started modifying this to my needs.

Here are some of his notes:

> They are designed only for desktop and are really designed to work woth Chrome's full-screen mode (ctrl+cmd+f on a mac) although this only matters for one or two slides.

> You can move forward by pressing the right arrow key, you can't step backwards through the animations but you can navigate back in the borwser to go to a previous 'screen'.

## Running the project

Install the dependencies...

```bash
npm install
```

...then start [Rollup](https://rollupjs.org):

```bash
npm run dev
```

Navigate to [localhost:5000](http://localhost:5000).

## Building and running in production mode

To create an optimised version of the app:

```bash
npm run build
```

## Deploy

`npm install -g now`
`cd public && now deploy --name svelteslides --prod -A ../now.json`
