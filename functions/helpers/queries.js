export const fetchAll = async ({ modelName, properties, where }) => {
  const queryName = `all${modelName}`;
  const query = `
      query {
        ${queryName}(where: $where, skip: 0, take: 200, sort: $sort) {
          results {
            id
            ${properties ? properties.join("\n") : ""}
          }
          totalCount
        }
      }
    `;
  console.log("FetchAllQuery", query, where);
  const { data, errors } = await graphql(query, where);

  if (errors) {
    console.error(JSON.stringify(errors));
    throw new Error(errors);
  }

  const { [queryName]: records } = data;

  return records;
};

export const fetchOne = async ({ modelName, properties, where }) => {
  const queryName = `one${modelName}`;
  const query = `
      query {
        ${queryName}(where: $where) {
          id
          ${properties ? properties.join("\n") : ""}
        }
      }
    `;

  const { data, errors } = await graphql(query, { where });

  if (errors) {
    throw new Error(errors);
  }

  const { [queryName]: record } = data;

  return record;
};

export const createMany = async ({ modelName, input }) => {
  const queryName = `createMany${modelName}`;
  const mutation = `
    mutation {
      ${queryName}(input: $input) {
        id
      }
    }
    `;
  const { data, errors } = await gql(mutation, {
    input: input,
  });

  if (errors) {
    throw new Error(errors);
  }

  return data;
};

export const updateOne = async ({ modelName, id, input }) => {
  const queryName = `update${modelName}`;
  const query = `
      mutation {
        ${queryName}(id: $id, input: $input) {
          id
        }
      }
    `;

  const { data, errors } = await graphql(query, { id, input });

  if (errors) {
    throw new Error(errors);
  }

  const { [queryName]: record } = data;

  return record;
};

export const updateMany = async ({ modelName, input, where }) => {
  const queryName = `updateMany${modelName}`;
  const mutation = `
      mutation {
        ${queryName}(input: $input, where: $where) {
          id
        }
      }
    `;

  const { data, errors } = await gql(
    mutation,
    {
      input: input,
    },
    { where }
  );

  if (errors) {
    throw new Error(errors);
  }

  return data;
};

export const upsertMany = async ({ modelName, input }) => {
  const queryName = `upsertMany${modelName}`;
  const mutation = `
    mutation {
      ${queryName}(input: $input) {
        id
      }
    }
    `;
  const { data, errors } = await gql(mutation, {
    input: input,
  });

  if (errors) {
    throw new Error(errors);
  }

  return data;
};

export const getAllRecords = async (gqlQuery, skip, take, results) => {
  const gqlResponse = await gql(gqlQuery, {
    skip: skip,
    take: take,
  });
  if (gqlResponse) {
    const gqlQueryObject = Object.values(gqlResponse)[0];
    const tmpResults = Object.values(gqlQueryObject)[0];

    skip += take;
    if (tmpResults.results.length) {
      const newResults = [...results, ...tmpResults.results];
      results = newResults;
      if (skip <= tmpResults.totalCount) {
        results = await getAllRecords(gqlQuery, skip, take, results);
      }
    }
  }
  return results;
};

const DEFAULT_RETRY_AMOUNT = 5;

export const graphql = async (query, filters, retry, prevError) => {
  if (retry === undefined) {
    retry = DEFAULT_RETRY_AMOUNT;
  }

  if (retry < 1) {
    throw new Error(prevError);
    // return { error: prevError };
  }

  try {
    return await gql(query, filters);
  } catch (error) {
    const remainingRetry = retry - 1;
    const queryName = query.split("(")[0].replace("{", "").trim();
    // console.log(`Remaining retries for ${queryName}: ${remainingRetry}`);

    const sleepTime = (1 / retry) * 2000;
    sleep(sleepTime);

    return await graphql(query, filters, remainingRetry, error.message);
  }
};
const sleep = (ms) => {
  const date = Date.now();
  let currentDate;
  do {
    currentDate = Date.now();
  } while (currentDate - date < ms);
};
