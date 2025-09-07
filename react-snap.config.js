module.exports = {
  source: "dist/public",
  destination: "dist/public",
  inlineCss: true,
  puppeteerArgs: ["--no-sandbox", "--disable-setuid-sandbox"],
  include: [
    "/",
    "/map",
    "/feed", 
    "/timeline",
    "/profile",
    "/chat",
    "/config"
  ],
  skipThirdPartyRequests: true,
  cacheAjaxRequests: false,
  preloadImages: false,
  port: 45678,
  minifyHtml: {
    collapseBooleanAttributes: true,
    collapseWhitespace: true,
    decodeEntities: true,
    keepClosingSlash: true,
    sortAttributes: true,
    sortClassName: true
  }
};