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

  const interactionsToCreate = interactions.map((i) => {
    const answerOptionId = answerOptions.find(
      (ao) => ao.id === i.surveyansweroption.id
    ).createdAnsweroptionId;
    const sourceQuestionId = answerOptions.find(
      (ao) => ao.surveyquestion.id === i.surveyansweroption.surveyquestion.id
    ).createdQuestionId;
    const targetQuestionId = questions.find(
      (q) => q.id === i.surveyquestion.id
    ).createdQuestionId;

    return {
      sourceQuestion: {
        id: sourceQuestionId,
      },
      answeroption: {
        id: answerOptionId,
      },
      question: {
        id: targetQuestionId,
      },
    };
  });

  const createdInteractions = await createMany({
    modelName: "Interaction",
    input: interactionsToCreate,
  });
  if (log) console.log("Created Interactions", createdInteractions);

  return { result: interactions };
};

export default CreateSubmissionInteractions;
