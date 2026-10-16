const noComments = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow comments in source.",
    },
    schema: [],
    messages: {
      comment: "Comments are not allowed",
    },
  },
  create(context) {
    return {
      Program() {
        const sourceCode = context.sourceCode;
        for (const comment of sourceCode.getAllComments()) {
          if (comment.type === "Shebang") continue;
          const raw = sourceCode.text.slice(comment.range[0], comment.range[1]);
          if (raw.startsWith("#!")) continue;
          const line = sourceCode.lines[comment.loc.start.line - 1] ?? "";
          if (line.startsWith("#!")) continue;
          context.report({
            loc: comment.loc,
            messageId: "comment",
          });
        }
      },
    };
  },
};

export default noComments;
