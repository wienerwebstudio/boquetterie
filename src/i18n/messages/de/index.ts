/**
 * German UI texts – the source for every other language. One file per area
 * (namespace), so areas can be translated and reviewed independently.
 * Placeholders use `{name}` and are filled with `fmt()`.
 */
import common from "./common";

const de = {
  common,
};

export default de;
export type Messages = typeof de;
