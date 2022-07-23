module.exports = (eleventyConfig) => {

  eleventyConfig.addPassthroughCopy('site/assets');
  eleventyConfig.addPassthroughCopy('lib');

  return {
    dir: {
      input: 'site',
    },
  };
};
