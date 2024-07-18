import { fetchOne, createMany, getAllRecords } from "../../helpers/queries.js";
import {
  validateArray,
  validateSubmission,
} from "../../helpers/validations.js";

const CreateSubmissionAnswerOptions = async ({
  submissionToken,
  questions,
  log,
}) => {
  const submission = await fetchOne({
    modelName: "Submission",
    properties: ["token", "survey{id}"],
    where: { token: { eq: submissionToken } },
  });
  validateSubmission(submission);
  validateArray(questions, "Questions", log, "Create Questions");
  if (log)
    console.log(
      `Creating Answer Options for Submission ${submissionToken}, based on Survey ID ${submission.survey.id}`
    );
  const questionIds = questions.map((q) => `"${q.id}"`).join(",");
  const answerOptionQuery = `
      query {
        allSurveyAnswerOption(where: {surveyquestion: {id: {in: [${questionIds}]}}}, skip: $skip, take: $take) {
        totalCount
        results{
            id
            value
            index
            score
            addScore
            answerOptionUuid
            surveyquestion {id}
          }
        }
      }
    `;
  const answerOptions = await getAllRecords(answerOptionQuery, 0, 200, []);
  const answerOptionsCount = validateArray(
    answerOptions,
    "AnswerOptions",
    log,
    "Create AnswerOptions"
  );
  if (answerOptionsCount === 0) {
    return { result: [] };
  }

  const answerOptionsToCreate = [];
  answerOptions.forEach((ao) => {
    answerOptionsToCreate.push({
      addScore: ao.addScore,
      answerOptionUuid: ao.answerOptionUuid,
      index: ao.index,
      question: {
        id: questions.find((obj) => obj.id === ao.surveyquestion.id)
          .createdQuestionId,
      },
      score: ao.score,
      value: ao.value,
    });
  });
  const createdAnswerOptions = await createMany({
    modelName: "Answeroption",
    input: answerOptionsToCreate,
  });
  if (log) console.debug("Created AnswerOptions", createdAnswerOptions);

  // add the created question ID to the answeroption collection to use that in interaction creation. The ids in passed back in the createMany are in the same order as passed in the initial array
  // This will be used in the next step
  // Also adding the createdQuestion to this to use as SourceQuestions in the creation of Interactions
  answerOptions.forEach((ao, idx) => {
    ao.createdAnsweroptionId =
      createdAnswerOptions.createManyAnsweroption[idx].id;
    ao.createdQuestionId = questions.find(
      (obj) => obj.id === ao.surveyquestion.id
    ).createdQuestionId;
  });
  if (log) console.debug("AnswerOptions", answerOptions);
  return { result: answerOptions };
};

export default CreateSubmissionAnswerOptions;
