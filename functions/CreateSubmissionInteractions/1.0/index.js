import { fetchOne, createMany, getAllRecords } from "../../helpers/queries.js";
import {
  validateArray,
  validateSubmission,
} from "../../helpers/validations.js";

const CreateSubmissionInteractions = async ({
  submissionToken,
  questions,
  answerOptions,
  log,
}) => {
  const submission = await fetchOne({
    modelName: "Submission",
    properties: ["token", "survey{id}"],
    where: { token: { eq: submissionToken } },
  });
  validateSubmission(submission);
  const interactionQuery = `
      query {
        allSurveyInteraction(where: {survey: {id: {eq: "${submission.survey.id}"}}}, skip: $skip, take: $take) {
        totalCount
        results{
            id
            surveyquestion {id}
            surveyansweroption {
                id
                surveyquestion {id}
                }
          }
        }
      }
    `;
  const interactions = await getAllRecords(interactionQuery, 0, 200, []);
  const interactionsCount = validateArray(
    interactions,
    "Interactions",
    log,
    "Create Interactions"
  );
  validateArray(answerOptions, "AnswerOptions", log, "Create Interactions");
  validateArray(questions, "Questions", log, "Create Interactions");
  if (interactionsCount === 0) {
    return { result: [] };
  }

  const interactionsToCreate = [];
  interactions.forEach((i) => {
    console.log("i", i);
    const answerOptionId = answerOptions.find(
      (ao) => ao.id === i.surveyansweroption.id
    ).createdAnsweroptionId;
    console.log("answerOptionId", answerOptionId);
    const sourceQuestionId = answerOptions.find(
      (ao) => ao.surveyquestion.id === i.surveyansweroption.surveyquestion.id
    ).createdQuestionId;
    console.log("sourceQuestionId", sourceQuestionId);
    const targetQuestionId = questions.find(
      (q) => q.id === i.surveyquestion.id
    ).createdQuestionId;
    console.log("targetQuestionId", targetQuestionId);

    interactionsToCreate.push({
      sourceQuestion: {
        // If this question...
        id: sourceQuestionId,
      },
      answeroption: {
        // Gets this answer
        id: answerOptionId,
      },
      question: {
        // This question will show
        id: targetQuestionId,
      },
    });
  });

  const createdInteractions = await createMany({
    modelName: "Interaction",
    input: interactionsToCreate,
  });
  if (log) console.log("Created Interactions", createdInteractions);

  return { result: interactions };
};

export default CreateSubmissionInteractions;
