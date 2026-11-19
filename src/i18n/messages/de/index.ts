/**
 * German UI texts – the source for every other language. One file per area
 * (namespace), so areas can be translated and reviewed independently.
 * Placeholders use `{name}` and are filled with `fmt()`.
 */
import common from "./common";
import layout from "./layout";
import ui from "./ui";
import home from "./home";
import content from "./content";
import forms from "./forms";
import shop from "./shop";
import product from "./product";
import cart from "./cart";
import checkout from "./checkout";
import account from "./account";
import reminders from "./reminders";

const de = {
  common,
  layout,
  ui,
  home,
  content,
  forms,
  shop,
  product,
  cart,
  checkout,
  account,
  reminders,
};

export default de;
export type Messages = typeof de;
