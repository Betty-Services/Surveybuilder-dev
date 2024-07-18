import { fetchOne, createMany, getAllRecords } from "../../helpers/queries.js";
import {
  validateArray,
  validateSubmission,
} from "../../helpers/validations.js";

const CreateSubmissionSections = async ({ submissionToken, log }) => {
  const submission = await fetchOne({
    modelName: "Submission",
    properties: ["name", "token", "survey{id}"],
    where: { token: { eq: submissionToken } },
  });
  validateSubmission(submission);

  if (log)
    console.log(
      `Creating Sections for Submission ${submission.token} based on Survey ID ${submission.survey.id}`
    );

  const sectionQuery = `
      query {
        allSurveySection(where: {survey: {id: {eq: "${submission.survey.id}"}}}, skip: $skip, take: $take) {
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
  validateArray(sections, "Sections", log, "Create Sections");
  if (log) console.log("Sections", sections);

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
  if (log) console.log("Created Sections", createdSections);
  // add the created section ID to the SurveySection collection to use that in question creation. The ids in passed back in the createMany are in the same order as passed in the initial array
  // This will be used in the next step
  sections.forEach((s, idx) => {
    s.createdSectionId = createdSections.createManySection[idx].id;
  });
  if (log) console.log("Created Sections", createdSections);

  return { result: sections };
};

export default CreateSubmissionSections;
