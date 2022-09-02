module.exports = {
  render(data) {
    console.log('render', data.scripts);

    return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link
      href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;700&display=swap"
      rel="stylesheet"
    />
    <link
      href="https://fonts.googleapis.com/css?family=Material+Icons&display=block"
      rel="stylesheet"
    />
    ${(data.scripts ?? [])
      .map((s) => `<script type="module" src="${s}"></script>`)
      .join('\n')}
    <style>
      body {
        margin: 0;
        --mdc-typography-font-family: 'Open Sans', Arial, Helvetica, sans-serif;
        font-family: var(--mdc-typography-font-family);
        font-size: 14px;
        line-height: 1.5;
        min-height: 100vh;
      }
      @media (max-width: 500px), (max-height: 500px) {
        body {
          max-height: 100vh;
          overflow: auto;
        }
      }
    </style>
    <title>${data.title}</title>
  </head>
  <body>
    ${data.content}
  </body>
</html>
    `;
  },
};
