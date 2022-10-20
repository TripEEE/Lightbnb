const { query } = require('express');
const { Pool } = require('pg')

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  port: 5432,
  database: 'lightbnb'
})

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */

const getUserWithEmail = (email) => {

  const toLowerCase = email.toLowerCase()
  return pool.query(`
    SELECT * FROM users
    WHERE users.email = $1
  `, [toLowerCase])
    .then((result) => {
      console.log(result.rows[0]);
      return result.rows[0]
    })
    .catch((err) => {
      console.log(err.message)
      return null
    })
}


/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */

const getUserWithId = (id) => {

  return pool.query(`
  SELECT * FROM users
  WHERE users.id = $1
  `, [id])
    .then((result) => {
      console.log(result.rows[0]);
      return result.rows[0]
    })
    .catch((err) => {
      console.log(err.message)
      return null
    })
}



/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */

//
const addUser = (name, email, password) => {

  return pool.query(`
    INSERT INTO users 
    (name, email, password) 
    VALUES ($1, $2, $3)
    RETURNING *; 
  `, [name, email, password])
    .then((result) => {
      console.log(result.rows[0]);
      return result.rows[0]
    })
    .catch((err) => {
      console.log(err.message)
      return null
    })
}

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */

const getAllReservations = (guest_id, limit = 10) => {

  return pool.query(`
    SELECT reservations.id, properties.*, reservations.start_date, 
    reservations.end_date, avg(rating) as average_rating
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1
    GROUP BY properties.id, reservations.id
    ORDER BY reservations.start_date
    LIMIT $2;
  `, [guest_id, limit])
    .then((result) => {
      console.log(result.rows);
      return result.rows
    })
    .catch((err) => {
      console.log(err.message)
      return null
    })
}

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const getAllProperties = function (options, limit = 10) {

  const queryParams = [];

  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  let stringToAppend = ''

  if (options.city) {
    queryParams.push(`%${options.city}%`);
    stringToAppend += `${stringToAppend === '' ? ` WHERE` : ` AND`} city LIKE $${queryParams.length}`;
  }

  if (options.owner_id) {
    queryParams.push(`${options.owner_id}`);
    stringToAppend += `${stringToAppend === '' ? ` WHERE` : ` AND`} owner_id = $${queryParams.length}`;
  }

  if (options.minimum_price_per_night) {
    queryParams.push(`${options.minimum_price_per_night * 100}`)
    stringToAppend += `${stringToAppend === '' ? ` WHERE` : ` AND`} cost_per_night > $${queryParams.length}`;
  }

  if (options.maximum_price_per_night) {
    queryParams.push(`${options.maximum_price_per_night * 100}`);
    stringToAppend += `${stringToAppend === '' ? ` WHERE` : ` AND`} cost_per_night < $${queryParams.length}`;
  }

  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    queryParams.push(`${options.minimum_price_per_night * 100}`)
    queryParams.push(`${options.maximum_price_per_night * 100}`);
    stringToAppend += `${stringToAppend === '' ? ` WHERE` : ` AND`} cost_per_night > $${queryParams.length - 1} AND cost_per_night < $${queryParams.length}`;
  }

  if (options.minimum_rating) {
    queryParams.push(`${options.minimum_rating}`)
    stringToAppend += `${stringToAppend === '' ? ` WHERE` : ` AND`} property_reviews.rating >= $${query.Params.length}`
  }

  queryParams.push(limit);
  queryString += stringToAppend
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  console.log(queryString, queryParams);

  return pool.query(queryString, queryParams)
    .then((res) => res.rows);
};


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */

//INSERT QUERY
const generateQuery = (tableName, obj) => {
  const objectEntries = Object.entries(obj)
  const keysJoined = objectEntries.map((entry) => entry[0]).join(', ')
  const values = objectEntries.map((entry) => entry[1])
  const query = `INSERT INTO ${tableName} (${keysJoined}) 
  VALUES (${Object.keys(obj).map((key, index) => `$${index + 1}`)})
  RETURNING *`
  return { query, values }
}

const addProperty = (property) => {
  const { query, values } = generateQuery('properties', property)
  return pool.query(query, values)
    .then((result) => {
      console.log(result.rows[0]);
      return result.rows[0]
    })
    .catch((err) => {
      console.log(err.message)
      return null
    })
}

exports.getAllReservations = getAllReservations;
exports.addProperty = addProperty;
exports.getAllProperties = getAllProperties;
exports.addUser = addUser;
exports.getUserWithId = getUserWithId;
exports.getUserWithEmail = getUserWithEmail;
