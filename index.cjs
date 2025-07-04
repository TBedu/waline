const Application = require('waline_akams');

module.exports = Application({
  plugins: [],
  async postSave(comment) {
    // do what ever you want after comment saved
  },
});
