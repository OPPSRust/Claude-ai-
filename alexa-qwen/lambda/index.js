const Alexa = require('ask-sdk-core');
const cfg = require('./config');
const { askQwen, escapeSsml, errorSpeech, trimHistory } = require('./qwen');

const REPROMPT = 'What else would you like to ask?';

const LaunchHandler = {
  canHandle: (h) => Alexa.getRequestType(h.requestEnvelope) === 'LaunchRequest',
  handle: (h) =>
    h.responseBuilder
      .speak('Hi, this is Qwen. What would you like to know?')
      .reprompt('Ask me anything.')
      .getResponse(),
};

const AskHandler = {
  canHandle: (h) =>
    Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
    ['AskQwenIntent', 'AMAZON.FallbackIntent'].includes(Alexa.getIntentName(h.requestEnvelope)),
  async handle(h) {
    const question =
      Alexa.getIntentName(h.requestEnvelope) === 'AskQwenIntent'
        ? Alexa.getSlotValue(h.requestEnvelope, 'query')
        : null;
    if (!question) {
      return h.responseBuilder
        .speak('Sorry, I did not catch that. Try saying, ask, then your question.')
        .reprompt(REPROMPT)
        .getResponse();
    }
    const session = h.attributesManager.getSessionAttributes();
    const history = session.history || [];
    try {
      const answer = await askQwen(question, history, cfg);
      session.history = trimHistory(
        [...history, { role: 'user', content: question }, { role: 'assistant', content: answer }],
        cfg.historyTurns,
      );
      h.attributesManager.setSessionAttributes(session);
      return h.responseBuilder.speak(escapeSsml(answer)).reprompt(REPROMPT).getResponse();
    } catch (err) {
      console.log('Qwen error', err);
      return h.responseBuilder.speak(errorSpeech(err)).reprompt(REPROMPT).getResponse();
    }
  },
};

const HelpHandler = {
  canHandle: (h) =>
    Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
    Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.HelpIntent',
  handle: (h) =>
    h.responseBuilder
      .speak('Say ask, then your question. For example, ask why is the sky blue. Say stop when you are done.')
      .reprompt(REPROMPT)
      .getResponse(),
};

const StopHandler = {
  canHandle: (h) =>
    Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
    ['AMAZON.CancelIntent', 'AMAZON.StopIntent'].includes(Alexa.getIntentName(h.requestEnvelope)),
  handle: (h) => h.responseBuilder.speak('Goodbye.').withShouldEndSession(true).getResponse(),
};

const SessionEndedHandler = {
  canHandle: (h) => Alexa.getRequestType(h.requestEnvelope) === 'SessionEndedRequest',
  handle: (h) => h.responseBuilder.getResponse(),
};

const ErrorHandler = {
  canHandle: () => true,
  handle(h, err) {
    console.log('Unhandled error', err);
    return h.responseBuilder.speak('Sorry, something went wrong.').reprompt(REPROMPT).getResponse();
  },
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(LaunchHandler, AskHandler, HelpHandler, StopHandler, SessionEndedHandler)
  .addErrorHandlers(ErrorHandler)
  .lambda();
