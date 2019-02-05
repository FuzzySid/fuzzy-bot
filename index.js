
const botkit = require('botkit');
const NLP = require('natural');
const fs = require('fs');

//Classfier
const classfier = new NLP.LogisticRegressionClassifier();

//Load environment variables
require('dotenv').config();

const scopes = [
    'direct_mention',
    'direct_message',
    'mention'
];

//Get slack API token
const token = process.env.SLACK_API_TOKEN;

//Create chatbot instance

const bot = botkit.slackbot({
    debug: false,
    storage: undefined
});

/**
 * Function to easily parse a given json file to a JavaScript Object
 * 
 * @param {String} filePath 
 * @returns {Object} Object parsed from json file provided
 */

function parseTrainingData(filePath){
    const trainingFile = fs.readFileSync('./trainingData.json');
    return JSON.parse(trainingFile);
}

/**
 * Will add the phrases to the provided classifier under the given label.
 * 
 * @param {Classifier} classifier
 * @param {String} label
 * @param {Array.String} phrases
 */

function trainClassifier(classfier,label,phrases){
    console.log('Teaching set',label,phrases);
        phrases.forEach((phrase) => {
            console.log('Teaching single ${label}: ${phrase}');
            classfier.addDocument(phrase.toLowerCase(), label);
            
        });
    }
    
/**
 *The trained classifier predicts labels the provided phrase belongs to with a
 * value associated with each and a guess of what the actual
 * label should be based on.
 * 
 * @param {String} phrase 
 * 
 * @returns {Object}
 */


function interpret(phrase){
    console.log('interpret',phrase);
    const guesses = classfier.getClassifications(phrase.toLowerCase());
    console.log('guesses',guesses);
    const guess = guesses.reduce((x,y)=> x && x.value > y.value ? x:y);
        return{
            probabilities: guesses,
            guess: guess.value > (0.7) ? guess.label: null
        };
}

/**
* Callback function for BotKit to call with the speech
* object to reply and the message that was provided as input.
* Function will take the input message, attempt to label it 
* using the trained classifier, and return the corresponding
* answer from the training data set. If no label can be matched
* with the set confidence interval, it will respond back saying
* the message was not able to be understood.
* 
* @param {Object} speech 
* @param {Object} message 
*/ 

//Incoming messages
function handleMessage(speech,message){
   const interpretation = interpret(message.text);
   console.log('InternChatBot heard: ',message.text);
   console.log('InternChatBot interpretation: ', interpretation);

   if(interpretation.guess && trainingData[interpretation.guess]){
       console.log('Found response');
       speech.reply(message, trainingData[interpretation.guess].answer);

   }else{
       console.log('Couldn\'t match phrase');
       speech.reply(message,'Bhai ye kya bol gaya samajh nhi aaya');
   }
}

const trainingData = parseTrainingData('./trainingData.json');

var i=0;
Object.keys(trainingData).forEach((element,key)=>{
    trainClassifier(classfier,element,trainingData[element].questions);
    i++;
    if(i === Object.keys(trainingData).length){
        classfier.train();
        const filePath = './classifier.json';
        classfier.save(filePath, (err,classfier)=>{
            if(err){
                console.error(err);
            }
            console.log('Created a classifier file in ',filePath);
        });
    }
});


//Configuration
bot.hears('.*',scopes,handleMessage);

//Instantiate and connect to Slack's API
bot.spawn({
    token: token
}).startRTM();
