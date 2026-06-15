/**
 * Nanzz
 * Auto Converted from PHP
 * Credit: Nanzz
 */

module.exports = {
  category: "search",
  post: false,
  path: "/search/search-wikipedia",
  desc: "Wikipedia search",
  params: ["q"],

  async run(req, res) {
    return res.status(501).json({
      status: false,
      message: "Auto converted stub. Manual logic migration required.",
      credit: "Nanzz"
    });
  }
};
