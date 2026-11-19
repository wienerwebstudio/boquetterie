import type { PartialMessages } from "@/i18n/messages";
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

/** UI texts – es. One file per namespace; missing keys fall back to German. */
const messages: PartialMessages = { common, layout, ui, home, content, forms, shop, product, cart, checkout, account, reminders };

export default messages;
