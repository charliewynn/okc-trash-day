const fetch = require("node-fetch");

async function testLocation(locationId) {
  let resp = await fetch(
    `https://data.okc.gov/services/portal/api/data/records/Address%20Trash%20Services?recordID=${locationId}`
  );
  let data = await resp.json();

  console.log("data", data);
}
//testLocation("1917074");

async function testSearch() {
  const query = "3705 Windscape Ave";
  let resp = await fetch(
    `https://data.okc.gov/services/portal/api/location/${query}`
  );
  let data = await resp.json();
  if (data && data.candidates && data.candidates.length) {
    let locationId = data.candidates[0].attributes.Ref_ID;
    testLocation(locationId);
  } else {
    //sorry, couldn't find that address
  }
}

testSearch();
