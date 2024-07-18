export const validateSubmission = (submission) => {
  if (!submission) {
    console.warning(submission);
    throw new Error("No submission found");
  }
  if (!submission.survey) {
    throw new Error("Submission is not linked to a Survey");
  }
};

// This validation will return an error if there are no sections or questions
// CheckboxQuestions, AnswerOptions and Interaction can potentially be empty and will not error out
export const validateArray = (array, name, log, source) => {
  if (!array) {
    console.error(`${name} is undefined. (Source: ${source})`);
    throw new Error(`${name} is undefined.`);
  }
  if (array.length === 0) {
    if (log) {
      switch (name) {
        case "AnswerOptions":
          console.log(
            `None of the questions have answer options. (Source: ${source})`
          );
          break;
        case "Interactions":
          console.log(
            `There are no interactions on this survey. (Source: ${source})`
          );
          break;
        case "CheckboxQuestions":
          console.log(
            `There are no checkbox questions on this survey. (Source: ${source})`
          );
          break;
        default:
          console.log(`${name} is empty. (Source: ${source})`);
      }
    }
    if (name === "Sections" || name === "Questions") {
      console.error(`${name} is empty. (Source: ${source})`);
      throw new Error(`${name} is empty.`);
    }
  } else {
    if (log) {
      console.log(`${name} has ${array.length} items. (Source: ${source})`);
    }
    return array.length;
  }
};
