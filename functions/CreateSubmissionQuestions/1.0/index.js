import {
  fetchOne,
  createMany,
  getAllRecords,
  upsertMany,
} from "../../helpers/queries.js";

const CreateSubmissionQuestions = async ({
  submissionToken,
  sections,
  log,
}) => {
  console.log("sections", sections);
  //   if (!sections || !sections[0] || !sections[0].createdSectionId) {
  //     throw new Error("Couldn't find created section.");
  //   }
  const submission = await fetchOne({
    modelName: "Submission",
    properties: ["token", "survey{id}"],
    where: { token: { eq: submissionToken } },
  });

  if (log) {
    console.log(
      `Creating questions for Submission ${submissionToken} based on Survey ID ${submission.survey.id}`
    );
    console.log("Sections", sections);
  }

  const sectionIds = sections.map((section) => section.id).join(",");
  const questionQuery = `
      query {
        allSurveyQuestion(where: {surveysection: {id: {in: [${sectionIds}]}}}, skip: $skip, take: $take) {
        totalCount
        results{
            id
            questionText
            explanation
            index
            isHidden
            isRequired
            label
            questionToken
            surveysection { id }
            questionType { id }
          }
        }
      }
    `;
  console.log("QuestionQuery", questionQuery);
  const questions = await getAllRecords(questionQuery, 0, 200, []);
  console.log("Questions", questions);
  const questionsToCreate = questions.map((q) => ({
    explanation: q.explanation,
    index: q.index,
    isHidden: q.isHidden,
    isRequired: q.isRequired,
    questionText: q.questionText,
    questionToken: q.questionToken,
    section: {
      id: sections.find((obj) => obj.id === q.surveysection.id)
        .createdSectionId,
    },
    submission: { id: submission.id },
    questionType: { id: q.questionType.id },
  }));
  const createdQuestions = await createMany({
    modelName: "Question",
    input: questionsToCreate,
  });
  if (log) console.debug("Created Questions", createdQuestions);

  // add the created question ID to the SurveyQuestion collection to use that in interaction creation. The ids in passed back in the createMany are in the same order as passed in the initial array
  // This will be used in the next step
  questions.forEach((q, idx) => {
    q.createdQuestionId = createdQuestions.createManyQuestion[idx].id;
  });

  const checkboxQuestions = questions.filter((q) => q.questionType.id === 3);
  if (log) console.log("checkboxQuestions", checkboxQuestions);
  const answersToCreate = Array.from(
    { length: checkboxQuestions.length },
    () => ({})
  );
  // Array of empty objects, as many as there are checkbox questions
  // Checkbox questions have to already have a answer precreated otherwise the pages break - they don't have anything assigned so this is an empty array of as many objects as there are checkbox questions
  // After being created empty, they have to be linked to the checkboxQuestions (1:1 relation) from the checkboxQuestions as you can't assign a HasMany.
  const createdAnswers = await createMany({
    modelName: "Answer",
    input: answersToCreate,
  });
  const questionsToUpdate = [];
  checkboxQuestions.forEach((q, idx) => {
    questionsToUpdate.push({
      id: q.createdQuestionId,
      answer: { id: createdAnswers.createManyAnswer[idx].id },
    });
  });
  await upsertMany({
    modelName: "Question",
    input: questionsToUpdate,
  });
  if (log) console.debug("Updated CheckboxQuestions", createdAnswers);

  return { result: questions };
};

export default CreateSubmissionQuestions;
