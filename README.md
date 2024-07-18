# Survey Builder - Submission Creation

## Overview

The Survey Builder - Submission Creation custom action steps optimize submission creation in the Survey Builder application by leveraging CreateMany mutations, significantly enhancing performance. The old situation consisted of looping through a collection and creating singular records inside of that loop and doing that recursively for the different models (Section, Question, AnswerOption, Interaction, Answer)

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [General Explanation](#general-explanation)
3. [Create Submission Sections](#create-submission-sections)
4. [Create Submission Questions](#create-submission-questions)
5. [Create Submission Answer Options](#create-submission-answer-options)
6. [Create Submission Interactions](#create-submission-interactions)
7. [Helpers](#helpers)
8. [Before and After](#before-and-after)
9. [Test Results](#test-results)
10. [Credits](#credits)

## Prerequisites

The flow is based on an existing Submission. Therefore the start of this action has not been changed: It starts by creating a new random token and using that to create an empty submission. These custom actions require an existing Submission to start with and the outputs of each step are used sequentially.

## General Explanation

Each step creates necessary data (e.g., questions, answer options) based on survey data. IDs of created records are added back to the survey data for linking parent-child relationships in subsequent steps. This approach reduces API calls and improves efficiency.

In the basis, each step will create the required data based on the survey data, e.g. create Questions based on the SurveyQuestions
To prevent unneccesary extra data api calls, the IDs of the records that are created (e.g. Questions) are added to the array of the survey data (e.g. SurveyQuestions) and those combined will be the output per step.
In the next step, the survey data ID (e.g. SurveyQuestion.id) will be used to fetch the next layer of survey data (e.g. SurveyAnsweroptions) and than in turn will also create the neccesary data (e.g. Answeroptions). The created data ID which was added to the survey data will then be used to link the right survey data to the right submission data's parent.
For example: the Questions step will create Questions based on SurveyQuestions. It will then return the SurveyQuestions, including an extra createdQuestionId property. That createdQuestionId will be used to link the created Answeroptions to the right created Question in the next step.
This process is repeated through all the steps. The last step, Interactions, also has this same set up, however, this output will not be not be needed anywhere after that step. This was merely done for uniformity in the steps.

## Create Submission Sections

The CreateSubmissionSections function automates the creation of sections within a submission in the Survey Builder application. This process is initiated by fetching the necessary data from the database, validating it, and then proceeding to create the sections based on the retrieved survey data.

### Implementation Details

The function begins by fetching a specific submission based on its token using the fetchOne helper function. This retrieved submission contains essential details such as its name, token, and a reference to the associated survey.

Next, the function validates the fetched submission to ensure it exists and contains the required data using the validateSubmission function.

If logging is enabled (log is true), the function logs the start of the section creation process, indicating the submission and survey IDs being processed.

Following this, a GraphQL query (sectionQuery) is constructed to retrieve all survey sections related to the submission's survey ID. These sections are fetched using the getAllRecords helper function, ensuring efficient retrieval with pagination control.

Once retrieved, the fetched sections are validated to ensure they are not empty and contain necessary data using the validateArray function. If logging is enabled, the function logs the fetched sections for transparency.

The function then maps over the fetched sections to prepare them for creation. Each section's details are structured into an object format suitable for submission creation, including properties such as description, index, name, possibleTotalScore, questionsCount, and a reference to the submission ID.

Using the createMany helper function, the function creates these sections in bulk within the application, optimizing performance by minimizing individual database transactions.

Upon successful creation, if logging is enabled, the function logs the details of the created sections, providing visibility into the operation's outcome.

To link the newly created section IDs back to the original sections for further processing, the function iterates over the original sections and adds a createdSectionId property to each corresponding section object. This step ensures that subsequent steps can reference and utilize these IDs as needed.

Finally, if logging is enabled, the function logs the final sections array with the added createdSectionId properties, completing the section creation process.

### Function Output

The function returns an object containing the sections array, which includes all processed sections with their respective createdSectionId properties. This output serves as the basis for subsequent steps in the submission creation workflow.

## Create Submission Questions

The CreateSubmissionQuestions function automates the creation of questions within sections of a submission in the Survey Builder application. This process involves fetching necessary data, validating inputs, and efficiently creating questions based on predefined survey sections.

### Implementation Details

The function begins by fetching a specific submission based on its token using the fetchOne helper function. This retrieved submission contains essential details such as its token and a reference to the associated survey.

The function also expects an array of sections (sections) as input, which is validated using the validateArray function to ensure it contains necessary data.

If logging is enabled (log is true), the function logs the start of the question creation process, displaying details of the submission and its associated survey, as well as the sections being processed.

Next, the function constructs a GraphQL query (questionQuery) to fetch all survey questions associated with the provided sections. This query ensures efficient retrieval of questions using pagination control.

The fetched questions are validated to ensure they are not empty and contain necessary data using the validateArray function. If logging is enabled, the function logs the fetched questions for transparency.

Each fetched question is then mapped into an object (questionsToCreate) suitable for creation within the application. This object includes properties such as explanation, index, isHidden, isRequired, questionText, questionToken, and references to the section ID (createdSectionId), submission ID, and question type ID.

Using the createMany helper function, the function creates these questions in bulk, optimizing performance by minimizing individual database transactions.

Upon successful creation, if logging is enabled, the function logs details of the created questions, providing visibility into the operation's outcome.

To facilitate further operations, the function links the newly created question IDs back to the original questions by adding a createdQuestionId property to each corresponding question object.

For checkbox questions specifically (identified by questionType.id === 3), additional steps are taken. The function filters out these checkbox questions and creates empty answer objects (answersToCreate) in a one-to-one relationship. These empty answers are then linked back to their respective checkbox questions using the upsertMany function, ensuring data integrity.

If logging is enabled, the function logs the updated checkbox questions after linking them with answers.

### Function Output

The function returns an object containing the questions array, which includes all processed questions. This output serves as the basis for subsequent steps in the submission creation workflow.

## Create Submission Answer Options

The CreateSubmissionAnswerOptions function automates the creation of answer options for questions within a submission in the Survey Builder application. This process involves fetching necessary data, validating inputs, and efficiently creating answer options based on predefined questions.

### Implementation Details

The function begins by fetching a specific submission based on its token using the fetchOne helper function. This retrieved submission contains essential details such as its token and a reference to the associated survey.

The function also expects an array of questions (questions) as input, which is validated using the validateArray function to ensure it contains necessary data.

If logging is enabled (log is true), the function logs the start of the answer option creation process, displaying details of the submission and its associated survey.

Next, the function constructs a GraphQL query (answerOptionQuery) to fetch all answer options associated with the provided questions. This query ensures efficient retrieval of answer options using pagination control.

The fetched answer options are validated to ensure they are not empty and contain necessary data using the validateArray function. If no answer options are found (answerOptionsCount === 0), the function returns an empty array as the result.

Each fetched answer option is then mapped into an object (answerOptionsToCreate) suitable for creation within the application. This object includes properties such as addScore, answerOptionUuid, index, question, score, and value, with references to the question ID (createdQuestionId).

Using the createMany helper function, the function creates these answer options in bulk, optimizing performance by minimizing individual database transactions.

Upon successful creation, if logging is enabled, the function logs details of the created answer options, providing visibility into the operation's outcome.

To facilitate further operations, the function links the newly created answer option IDs back to the original answer options by adding a createdAnsweroptionId property to each corresponding answer option object. It also adds createdQuestionId for use in subsequent interaction creation.

### Function Output

The function returns an object containing the answerOptions array, which includes all processed answer options. This output serves as the basis for subsequent steps in the submission creation workflow.

## Create Submission Interactoins

The CreateSubmissionInteractions function automates the creation of interactions between questions and answer options within a submission in the Survey Builder application. This process involves fetching necessary data, validating inputs, and efficiently creating interactions based on predefined relationships.

### Implementation Details

The function begins by fetching a specific submission based on its token using the fetchOne helper function. This retrieved submission contains essential details such as its token and a reference to the associated survey.

The function expects arrays of questions and answerOptions as inputs, which are validated using the validateArray function to ensure they contain necessary data.

If logging is enabled (log is true), the function logs the start of the interaction creation process, displaying details of the submission and its associated survey.

Next, the function constructs a GraphQL query (interactionQuery) to fetch all interactions associated with the provided survey. This query ensures efficient retrieval of interactions using pagination control.

The fetched interactions are validated to ensure they are not empty and contain necessary data using the validateArray function. If no interactions are found (interactionsCount === 0), the function returns an empty array as the result.

Each fetched interaction is then mapped into an object (interactionsToCreate) suitable for creation within the application. This object includes properties such as sourceQuestion, answeroption, and question, with references to the IDs of the source question, answer option, and target question.

Using the createMany helper function, the function creates these interactions in bulk, optimizing performance by minimizing individual database transactions.

Upon successful creation, if logging is enabled, the function logs details of the created interactions, providing visibility into the operation's outcome.

### Function Output

The function returns an object containing the interactions array, which includes all processed interactions. This output serves as the completion of the submission creation workflow in the Survey Builder application.

## Helpers

### Queries

#### fetchOne

The fetchOne function retrieves a single record (modelName) based on specified properties and where conditions using GraphQL queries. It handles GraphQL errors and returns the retrieved record.

#### createMany

The createMany function performs a mutation (createMany${modelName}) to create multiple records (input) of the specified modelName using GraphQL. It handles GraphQL errors and returns the created records.

#### upsertMany

The upsertMany function performs an upsert operation (upsertMany${modelName}) to update or insert multiple records (input) of the specified modelName using GraphQL. It handles GraphQL errors and returns the updated or inserted records.

#### getAllRecords

The getAllRecords function retrieves all records from GraphQL based on a provided query (gqlQuery). It handles pagination (skip, take) to fetch all results and returns them as an array.

#### graphql

The graphql function executes a GraphQL query (query) with optional filters, handling retries in case of errors up to a default retry amount. It ensures robust query execution and error handling.

#### sleep

The sleep function pauses execution for a specified number of milliseconds (ms) using a busy-wait loop, ensuring a delay in operations.

### Validations

#### validateSubmission

The validateSubmission function checks if a submission object exists and is linked to a survey. It throws errors if the submission is missing or not properly linked.

#### validateArray

The validateArray function validates arrays (array) based on their content (name) and logs information (log) about their state from a specified source.

Throws an error if array is undefined or empty for Sections and Questions.
Logs messages for AnswerOptions, Interactions, and CheckboxQuestions if they are empty but does not throw errors.

## Before and After

The action still starts the same: with a Generate Random Hex-step and Create Submission Step.
The following image displays the rest of the action in the old situation, using only standard action steps:
[image-old]: https://gyazo.com/0506eec549f8ef9f3efce24f1b697d48

This has now been reduced to only a few, custom coded steps:
[image-new]: https://i.gyazo.com/a8655e7da61807d7b8c3fd71dfdc8338.png

Although the amount steps have been reduced quite significantly, the functionality remained the same, just using CreateMany mutations in stead of loops and singular creates.

## Test results

To test the improvements, we've used the default available survey 'SLDC Analysis Survey' to benchmark, in the runtime flow of the application.
This Survey had 50 questions over 8 sections at time of testing. To test both flow, we've added a condition before triggering the first loop in the old situation and let that condition determine if we're testing the old or the new flow. Tests we're done in threefold to get a good enough impression of the improvement. All 3 tests we're executed on an application on the US2 zone and performed from Atlanta.

Performance comparison using the 'SLDC Analysis Survey':

| Test Run | Old Execution Time | New Execution Time |
| -------- | ------------------ | ------------------ |
| 1        | 13.38 seconds      | 1.72 seconds       |
| 2        | 13.14 seconds      | 1.61 seconds       |
| 3        | 13.26 seconds      | 1.71 seconds       |

Tests conducted on US2 zone from Atlanta.

## Credits

- **Development**: Marcel Korporaal
- **Queries and Support**: Bob Hansen
- **Review**: Chiel Wester
- **Client Acceptance**: Betty Blocks Client

Date of Last Update: July 18th, 2024
