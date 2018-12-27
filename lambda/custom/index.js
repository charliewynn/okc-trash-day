/* eslint-disable  func-names */
/* eslint-disable  no-console */
/* eslint-disable  no-restricted-syntax */

const Alexa = require("ask-sdk");
const fetch = require("node-fetch");

const SKILL_NAME = "Oklahoma City Trash Day";
const FALLBACK_MESSAGE_DURING_GAME = `The ${SKILL_NAME} skill can't help you with that.  Try saying "when is my next trash day" `;
const FALLBACK_REPROMPT_DURING_GAME = "Try saying 'when is my next trash day'";
const FALLBACK_MESSAGE_OUTSIDE_GAME = `The ${SKILL_NAME} skill can't help you with that.  If you give me your oklahoma city address, it can tell you your next trash, recycling, or big trash day.`;
const FALLBACK_REPROMPT_OUTSIDE_GAME =
  "Try saying 'Ask ${SKILL_NAME} when is my next recycling day'";

async function GetTrashData(locationId) {
  let resp = await fetch(
    `https://data.okc.gov/services/portal/api/data/records/Address%20Trash%20Services?recordID=${locationId}`
  );
  let data = await resp.json();

  function getRecord(fieldName) {
    var fields = data.Fields.filter(f => f.FieldName == fieldName);
    if (fields.length == 1) return data.Records[0][fields[0].FieldID];
  }
  function dateToVoice(date) {
    const days = "Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday".split(
      ","
    );
    const months = "January,February,March,April,May,June,July,August,September,October,November,December".split(
      ","
    );
    return (
      days[date.getDay()] +
      " " +
      months[date.getMonth()] +
      ' <say-as interpret-as="ordinal">' +
      date.getDate() +
      "</say-as>"
    );
  }
  const trashDay = getRecord("Trash_Day");
  let speechOutput = `Your trash day is ${trashDay}. `;

  function isToday(date, now) {
    return (
      date.getFullYear() == now.getFullYear() &&
      date.getMonth() == now.getMonth() &&
      date.getDate() == now.getDate()
    );
  }

  let today = new Date();
  today.setTime(today.getTime() - 300 * 60 * 1000);
  today.setHours(0);
  today.setMinutes(0);
  today.setSeconds(0);
  today.setMilliseconds(0);

  let nextRecycling = getRecord("Next_Recycle_Day_1");
  //nextRecycling = "Oct 26, 2018";
  if (nextRecycling) {
    if (isToday(new Date(nextRecycling), today)) {
      speechOutput += `Today is recycling day, put your bins out. `;
      nextRecycling = getRecord("Next_Recycle_Day_2");
    }
    if (today > new Date(nextRecycling)) {
      nextRecycling = getRecord("Next_Recycle_Day_2");
    }
    //in case next recycling 2 is null
    if (nextRecycling) {
      speechOutput += `Your next recycling day is ${dateToVoice(
        new Date(nextRecycling)
      )}. `;
    }
  }
  let nextBulky = getRecord("Next_Bulky_Day_1");
  if (nextBulky) {
    if (isToday(new Date(nextBulky), today)) {
      speechOutput += `Today is bulky trash day, put your bulky trash out. `;
      nextBulky = getRecord("Next_Bulky_Day_2");
    }
    if (today > new Date(nextBulky)) {
      nextRecycling = getRecord("Next_Bulky_Day_2");
    }
    //in case next bulky 2 is null
    if (nextBulky) {
      speechOutput += `Your next bulky trash day is ${dateToVoice(
        new Date(nextBulky)
      )}. `;
    }
  }

  return speechOutput;
}

const LaunchRequest = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "LaunchRequest" ||
      handlerInput.requestEnvelope.request.type === "GetTrashDay"
    );
  },
  async handle(handlerInput) {
    const attributesManager = handlerInput.attributesManager;
    const responseBuilder = handlerInput.responseBuilder;

    console.log("getting attributes");
    const attributes =
      (await attributesManager.getPersistentAttributes()) || {};

    console.log("attributes", attributes);

    attributesManager.setSessionAttributes(attributes);

    if (attributes.locationId) {
      const speechOutput =
        (await GetTrashData(attributes.locationId)) +
        " You can say 'change my address' or say 'goodbye'.";
      console.log("out", speechOutput);
      return responseBuilder
        .speak(speechOutput)
        .reprompt("Say 'change my address' or say 'goodbye'.")
        .getResponse();
    }

    let speechOutput = `Welcome to Oklahoma City Trash Day. `;
    const reprompt = `Tell me your address and I can let you know your next trash day.`;

    return responseBuilder
      .speak(speechOutput + reprompt)
      .reprompt(reprompt)
      .getResponse();
  }
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return (
      request.type === "IntentRequest" &&
      (request.intent.name === "AMAZON.CancelIntent" ||
        request.intent.name === "AMAZON.StopIntent")
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak("Thanks for using Oklahoma City trash day!")
      .getResponse();
  }
};

const SessionEndedRequest = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "SessionEndedRequest";
  },
  handle(handlerInput) {
    console.log(
      `Session ended with reason: ${
        handlerInput.requestEnvelope.request.reason
      }`
    );
    return handlerInput.responseBuilder.getResponse();
  }
};

const HelpIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return (
      request.type === "IntentRequest" &&
      request.intent.name === "AMAZON.HelpIntent"
    );
  },
  handle(handlerInput) {
    const speechOutput =
      "If you tell me your Oklahoma City address, I can let you know your next trash, recycling, or big trash day.";
    const reprompt = "Try asking for your next trash date.";

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(reprompt)
      .getResponse();
  }
};

const UnhandledIntent = {
  canHandle() {
    return true;
  },
  handle(handlerInput) {
    const outputSpeech =
      "Tell me your address and I can tell you your next trash day";
    return handlerInput.responseBuilder
      .speak(outputSpeech)
      .reprompt(outputSpeech)
      .getResponse();
  }
};

const ChangeAddressIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return (
      request.type === "IntentRequest" &&
      request.intent.name === "ChangeAddressIntent"
    );
  },
  async handle(handlerInput) {
    const responseBuilder = handlerInput.responseBuilder;
    return responseBuilder
      .speak(
        `Tell me your street number and name, for example "100 metropolitan boulevard".`
      )
      .reprompt(
        `Tell me your street number and name, for example "100 metropolitan boulevard".`
      )
      .getResponse();
  }
};

const GiveAddressIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return (
      request.type === "IntentRequest" &&
      request.intent.name === "GiveAddressIntent"
    );
  },
  async handle(handlerInput) {
    const {
      requestEnvelope,
      attributesManager,
      responseBuilder
    } = handlerInput;

    const address = requestEnvelope.request.intent.slots.address.value.replace(
      /(\d)\s(\d)/g,
      "$1$2"
    );
    let resp = await fetch(
      `https://data.okc.gov/services/portal/api/location/${address}`
    );
    let data = await resp.json();
    if (data && data.candidates && data.candidates.length) {
      let locationId = data.candidates[0].attributes.Ref_ID;
      //testLocation(locationId);

      const sessionAttributes = attributesManager.getSessionAttributes();
      sessionAttributes.locationId = locationId;
      attributesManager.setPersistentAttributes(sessionAttributes);
      await attributesManager.savePersistentAttributes();
      const output =
        (await GetTrashData(sessionAttributes.locationId)) +
        " You can say 'change my address' or say 'goodbye'.";
      return responseBuilder
        .speak(output)
        .reprompt("Say 'change my address' or say 'goodbye'.")
        .getResponse();
    } else {
      //sorry, couldn't find that address
      console.log("Couldn't find " + address);
      return responseBuilder
        .speak(
          `Sorry, I couldn't match ${address} to an Oklahoma city address. Try telling me your address again.`
        )
        .reprompt("Try telling me your address again")
        .getResponse();
    }
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak("Sorry, I can't understand the command. Please say again.")
      .reprompt("Sorry, I can't understand the command. Please say again.")
      .getResponse();
  }
};

const FallbackHandler = {
  // 2018-May-01: AMAZON.FallackIntent is only currently available in en-US locale.
  //              This handler will not be triggered except in that locale, so it can be
  //              safely deployed for any locale.
  canHandle(handlerInput) {
    // handle fallback intent, yes and no when playing a game
    // for yes and no, will only get here if and not caught by the normal intent handler
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === "IntentRequest" &&
      (request.intent.name === "AMAZON.FallbackIntent" ||
        request.intent.name === "AMAZON.YesIntent" ||
        request.intent.name === "AMAZON.NoIntent")
    );
  },
  handle(handlerInput) {
    const attributesManager = handlerInput.attributesManager;
    const sessionAttributes = attributesManager.getSessionAttributes();

    if (
      sessionAttributes.gameState &&
      sessionAttributes.gameState === "STARTED"
    ) {
      // currently playing

      return handlerInput.responseBuilder
        .speak(FALLBACK_MESSAGE_DURING_GAME)
        .reprompt(FALLBACK_REPROMPT_DURING_GAME)
        .getResponse();
    }

    // not playing
    return handlerInput.responseBuilder
      .speak(FALLBACK_MESSAGE_OUTSIDE_GAME)
      .reprompt(FALLBACK_REPROMPT_OUTSIDE_GAME)
      .getResponse();
  }
};

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequest,
    ExitHandler,
    ChangeAddressIntent,
    SessionEndedRequest,
    HelpIntent,
    GiveAddressIntent,
    FallbackHandler,
    UnhandledIntent
  )
  .addErrorHandlers(ErrorHandler)
  .withTableName("okc-trash-day2")
  .withAutoCreateTable(true)
  .lambda();
