import {
  fetchOne,
  upsertMany,
  createMany,
  getAllRecords,
  updateOne,
} from "../../helpers/queries.js";

const CreateSurveySubmission = async ({ submissionToken }) => {
  console.log("submissionToken", submissionToken);
  const submission = await fetchOne({
    modelName: "Submission",
    properties: ["name", "token", "survey{token}"],
    where: { token: { eq: submissionToken } },
  });
  console.log("Submission", submission);
  const survey = await fetchOne({
    modelName: "Survey",
    properties: ["name", "token"],
    where: { token: { eq: submission.survey.token } },
  });
  console.log("Survey", survey);

  const sectionQuery = `
      query {
        allSurveySection(where: {survey: {id: {eq: "${survey.id}"}}}, skip: $skip, take: $take) {
        totalCount
        results{
            id
            name
            index
            possibleTotalScore
            questionsCount
            description
          }
        }
      }
    `;
  const sections = await getAllRecords(sectionQuery, 0, 200, []);
  console.log("Sections", sections);
  const sectionIds = sections.map((s) => s.id);
  console.log("sectionIds", sectionIds);

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
            questionType { id, hasAnswerOptions }
          }
        }
      }
    `;
  console.log("QuestionQuery", questionQuery);
  const questions = await getAllRecords(questionQuery, 0, 200, []);
  console.log("Questions", questions);
  const questionIds = questions.map((q) => q.id);
  console.log("questionIds", questionIds);

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
  console.log("AnswerOptions", answerOptions);
  const interactionQuery = `
      query {
        allSurveyInteraction(where: {survey: {id: {eq: "${survey.id}"}}}, skip: $skip, take: $take) {
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
  console.log("Interactions", interactions);
  const sectionsToCreate = sections.map((s) => ({
    description: s.description,
    index: s.index,
    name: s.name,
    possibleTotalScore: s.possibleTotalScore,
    questionsCount: s.questionsCount,
    submission: { id: submission.id },
  }));
  const createdSections = await createMany({
    modelName: "Section",
    input: sectionsToCreate,
  });
  console.debug("Created Sections", createdSections);

  sections.forEach((s, idx) => {
    // add the created section ID to the SurveySection collection to use that in question creation. The ids in passed back in the createMany are in the same order as passed in the initial array
    s.createdSectionId = createdSections.createManySection[idx].id;
  });
  // const sectionIdToCreatedSectionIdMap = sections.reduce((acc, section) => {
  //   acc[section.id] = section.createdSectionId;
  //   return acc;
  // }, {});
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

  console.log("sections", sections);
  console.log("questionsToCreate", questionsToCreate);

  const createdQuestions = await createMany({
    modelName: "Question",
    input: questionsToCreate,
  });
  console.debug("Created Questions", createdQuestions);

  // add the created question ID to the SurveyQuestion collection to use that in interaction creation. The ids in passed back in the createMany are in the same order as passed in the initial array
  questions.forEach((q, idx) => {
    q.createdQuestionId = createdQuestions.createManyQuestion[idx].id;
  });

  const checkboxQuestions = questions.filter((q) => q.questionType.id === 3);
  console.log("checkboxQuestions", checkboxQuestions);
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
  console.log("answerOptionsToCreate", answerOptionsToCreate);
  const createdAnswerOptions = await createMany({
    modelName: "Answeroption",
    input: answerOptionsToCreate,
  });
  console.debug("Created AnswerOptions", createdAnswerOptions);
  answerOptions.forEach((ao, idx) => {
    ao.createdAnsweroptionId =
      createdAnswerOptions.createManyAnsweroption[idx].id;
  });

  // SurveyInteraction belongs to the (source) SurveyAnswerOption and belongs to the (target) SurveyQuestion
  // ^--> If the (Survey)AnswerOption is selected, the (Survey)Question will show
  // The eventual Interaction belongs to the (source) AnswerOption AND its parent SourceQuestion AND its (target) question.
  // ^--> If the (source) AnswerOptions, from sourceQuestion is selected, (target) Question will show
  const AnswerOptionIdToCreatedAnsweroptionIdMap = answerOptions.reduce(
    (acc, answeroption) => {
      acc[answeroption.id] = answeroption.createdAnsweroptionId;
      return acc;
    },
    {}
  );
  const questionIdToCreatedQuestionIdMap = questions.reduce((acc, question) => {
    acc[question.id] = question.createdQuestionId;
    return acc;
  }, {}); //@Chiel ik heb m hier nog laten staan want anders kom ik niet bij de createdSourceQuestionID EN de createdTargetQuestionID volgens mij

  const interactionsToCreate = [];
  interactions.forEach((i) => {
    const answerOptionId =
      AnswerOptionIdToCreatedAnsweroptionIdMap[i.surveyansweroption.id];
    const sourceQuestionId =
      questionIdToCreatedQuestionIdMap[i.surveyansweroption.surveyquestion.id];
    const targetQuestionId =
      questionIdToCreatedQuestionIdMap[i.surveyquestion.id];
    // const targetQuestionId = questions.find(q => q.id === i.surveyquestion.id).createdQuestionId;
    // Deze kan wel vervangen worden, maar de sourceQuestionId niet volgens mij
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
  console.log("interactionsToCreate", interactionsToCreate);
  const createdInteractions = await createMany({
    modelName: "Interaction",
    input: interactionsToCreate,
  });
  console.debug("Created Interactions", createdInteractions);

  return { as: createdInteractions };
};

export default CreateSurveySubmission;
