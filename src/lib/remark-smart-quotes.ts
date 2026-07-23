import { visit } from "unist-util-visit";
import type { Root, Text } from "mdast";
import { smartQuotes } from "./typography";

/**
 * Remark plugin: applies smartQuotes() to `text` mdast nodes only.
 * Code blocks (`code` nodes) and inline code (`inlineCode` nodes) are
 * separate node types in the mdast tree, so visiting only `text` nodes
 * naturally leaves code/URLs/etc. untouched.
 */
export function remarkSmartQuotes() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text) => {
      node.value = smartQuotes(node.value);
    });
  };
}
