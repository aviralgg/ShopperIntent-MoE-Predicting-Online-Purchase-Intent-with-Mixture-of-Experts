// Renders the icons used on the title slide to PNG (run once; output in figures/).
const path = require("path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const sharp = require("sharp");
const { FaShoppingCart, FaUsers, FaChartLine } = require("react-icons/fa");
const icons = { cart: FaShoppingCart, users: FaUsers, chart: FaChartLine };
(async () => {
  for (const [name, Icon] of Object.entries(icons)) {
    const svg = renderToStaticMarkup(React.createElement(Icon, { color: "#FFFFFF", size: 512 }));
    await sharp(Buffer.from(svg)).resize(512, 512).png().toFile(path.join(__dirname, "figures", `icon_${name}.png`));
  }
  console.log("icons written");
})();
