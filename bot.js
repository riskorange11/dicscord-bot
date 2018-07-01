const Discord = require('discord.js');
var fs = require('fs');
var https = require('https');
const csv = require("csvtojson");
var datetime = require('node-datetime');
const readline = require('readline');
const {google} = require('googleapis');


//For Google API
// If modifying these scopes, delete credentials.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.file',
				'https://www.googleapis.com/auth/drive',
				'https://www.googleapis.com/auth/drive.readonly'];
const TOKEN_PATH = 'credentials.json';

//For Discord API
const client = new Discord.Client();

//For Discord. The chat ID in which to post messages.
var chatID = "458069669476302861";

//Variable to hold the reference to hold setInterval.
var setInt;

//The event when the discord bot comes online
client.on('ready', function() {
	
    console.log(`Logged in as ${client.user.tag}!`);
	
	loopFunc();
});

client.on('message', (msg) => {
	
	if(msg.content === '>prep')
	{
		msg.reply("Downloaded file from google drive");
		
		// Load client secrets from a local file.
		fs.readFile('client_secret.json', (err, content) => {
		if (err) return console.log('Error loading client secret file:', err);
		// Authorize a client with credentials, then call the Google Drive API.
  
		//authorize(JSON.parse(content), listFiles);
		authorize(JSON.parse(content), testDownload);
		});

		
		msg.reply("Converted contents of csv file to json");
		setTimeout(function(){
			convertCSVToJSON();
		},1000);
		
		msg.reply("Formatted data.json file to approriate elements");
		setTimeout(function(){
			formatJSONFile();
		},3000);
	}
	
	//reply user ID
	if(msg.content === '!id') {
		msg.reply("Your ID is: " + msg.member.id);
	}
	
	//Useless functions
	/**
	//Download csv contends from google drive
	if(msg.content === '>download')
	{
		msg.reply("Downloaded file from google drive");
		// Load client secrets from a local file.
		fs.readFile('client_secret.json', (err, content) => {
		if (err) return console.log('Error loading client secret file:', err);
		// Authorize a client with credentials, then call the Google Drive API.
  
		//authorize(JSON.parse(content), listFiles);
		authorize(JSON.parse(content), testDownload);
		});
	}

	//Load csv to json
	if(msg.content === '>load')
	{
		msg.reply("Ran load command. Converted contents of csv file to json");
		setTimeout(function(){
			convertCSVToJSON();
		},1000);
		
	
	}
	
	//Formats json file to approriate contents
	if(msg.content === '>format')
	{
		msg.reply("Ran format command. Formatted data.json file to approriate elements");
		setTimeout(function(){
			formatJSONFile();
		},1000)
	}
	**/

	//Loop mechanism that runs every 10 seconds to check if stocks have reached entry or exit
	if(msg.content === '>start')
	{
		
		try
		{
			var misc = JSON.parse(fs.readFileSync('misc.json', 'utf8'));
		} 
		catch (err) 
		{
			console.log(err);
		}
		
		if(misc['loopOn'] === false)
		{
			msg.reply("Starting program to check for entry and exit");
			loopFunc();
		}
		else
		{
			msg.reply("Looping Already in progress. To stop the loop enter >stop");
		}
	}
	
	
	//Tests once if the stocks have reached entry or exit
	if (msg.content === '>get') 
	{

        //Checks if json file exists and is in the suitable format.
        try {
            //Creates a json object 
            var stockList = JSON.parse(fs.readFileSync('data.json', 'utf8'));
            msg.reply("File Found And Loaded Sucessfully");
        } catch (err) {

            msg.reply("Error: Check if data.json file exists and that the json file is in the correct format");
            console.log(err);
        }
	
		var time = getTimeInHoursAndMinutes();
		
	
		getAPICall(-1,stockList,msg);
    }
	
	//Stops looping mechanism
	if(msg.content === '>stop')
	{
		msg.reply("Looping Program Stopped");
		
		try
		{
           //Creates a json object
            var misc = JSON.parse(fs.readFileSync('misc.json', 'utf8'));
		} 
		catch (err) 
		{
			console.log(err);
		}
		
		//Rewrites misc.json field of loopOn to false
		misc['loopOn'] = false;
	
		try {
			misc = JSON.stringify(misc, null, 4);
			fs.writeFileSync('misc.json', misc, 'utf8');
		
		} catch (err) {
			console.log(err);
		}
	}
	
	//A dummy command to get time and test if bot is functional
	if(msg.content === '>time')
	{
		var dt = datetime.create();
		var formatted = dt.format('m/d/Y H:M:S');
		
		
		msg.reply(formatted);
		
		
	}
	
	//List of commands
	if(msg.content === '>help')
	{
		msg.reply("Commands: >time, >stop, >get, >start, >prep\nSteps On How To Run.\n1 Type in discord chat >prep (This downloads the excel spreadsheet from google drive).\n2 Type in discord chat >start. (Alert Bot should now do a running check of each ticker every 10 seconds)\n3. Type in discord chat >stop to stop the loop");
		
	}
});

//Google API functions

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

//Google API functions

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return callback(err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}


/**
Actual function that downloads the google drive document
*/

function testDownload(auth) {
	const drive = google.drive({version: 'v3', auth});

	//var dest = fs.createWriteStream('Watchlist_Alert.csv');
	
	drive.files.export({
		fileId: "1D4TOH7ADvA9xJZTZ4WIvztNSUFpeC7MsoCcGFOrOwkw",
		mimeType: 'text/csv',
		
	}, function(err, response){
		
		if(err)
		{
			console.log("Error: " + err);
			return;
		}
		
		
		//Writes data to Watchlist_Alert.csv 
		fs.writeFileSync("Watchlist_Alert.csv", response.data);
		
	});
}


/**
Function to prep for looping. Used when bot starts up and when command >start is called in discord
**/
function loopFunc()
{
	//Checks if json file exists and is in the suitable format.
	try
	{
        //Creates a json object 
		var stockList = JSON.parse(fs.readFileSync('data.json', 'utf8'));
		var misc = JSON.parse(fs.readFileSync('misc.json', 'utf8'));
	} 
	catch (err) 
	{
		console.log(err);
	}
	
	//Rewrites misc.json field of loopOn to true
	misc['loopOn'] = true;
	
	try {
        misc = JSON.stringify(misc, null, 4);
        fs.writeFileSync('misc.json', misc, 'utf8');
		
    } catch (err) {
        console.log(err);
    }
	
	//Loops checking data every 10 seconds
	var temp;
	temp = setInterval(function()
	{
		try
		{
			//Creates a json object 
			stockList = JSON.parse(fs.readFileSync('data.json', 'utf8'));
			misc = JSON.parse(fs.readFileSync('misc.json', 'utf8'));
		} 
		catch (err) 
		{	
			console.log(err);
		}
		
		//Stops loop if field of loopOn in misc.json is false
		if(misc['loopOn'] === false)
		{
			clearInterval(temp);
		}
		
			var dt = datetime.create();
			var formatted = dt.format('m/d/Y');
			var formatted1 = dt.format('m/d/Y H:M:S');
			var dayOfWeek = dt.format('W')
			
			var time = getTimeInHoursAndMinutes();
			
			//Check if it is weekend.
			if(dayOfWeek !== 'Saturday' && dayOfWeek !== 'Sunday')
			{
				
				//If time is 9:00 A.M EST, then sends a message that pre-market has ended and regular market starts
				if(time[0] === 9 && time[1] === 30 && time[2] >= 0 && time[2] < 10)
				{
				
					client.channels.get(chatID).send("Regular Trading Starts");
					console.log("Market Start");
				}	
				//Indicate regular market close and indicate the start of post market. 
				else if(time[0] === 16 && time[1] === 0 && time[2] >= 0 && time[2] < 10)
				{
					client.channels.get(chatID).send("Regular Trading Ends");
					
					console.log("Market Close");
				}				
			
				if(time[0] >= 9 && time[0] < 16)
				{
					if(time[0] === 9 && time[1] >= 30)
					{
						//From between 9:30 and 10:00
						getAPICall(0,stockList,msg);
				
						console.log("Regular Market");
					}
				
					if(time[0] !== 9)
					{
						//from 10:00 A.M to 4:00 P.M
						getAPICall(0,stockList,msg);
				
						console.log("Regular Market");
					}
				}
			
				console.log(dayOfWeek + ": " +formatted1);
			
			}
			else
			{
				console.log("Weekend: " + dayOfWeek);
			}
		//Numerical value in milliseconds. Loops every 10 seconds until the program terminates. 
		},10000);	
}

//HTTPS methods for getting IPEX Data
//Does http GET method of individual stock price and comparies if the stock has hit entry or exit. 
function getAPICall(i,stockList,msg)
{
	if(i < getNumberOfStocks()-1)
	{

		setTimeout(function(){
			
			https.get("https://api.iextrading.com/1.0/stock/" + stockList[i]['Ticker'] + "/batch?types=price,chart&range=1d&chartLast=5", function(res){
				//What does this mean?
				const { statusCode } = res;
				const contentType = res.headers['content-type'];
		
				//Error handling
				let error;
				
				//If the resource 
				if (statusCode !== 200) {
					error = new Error('Request Failed.\n' +
                      `Status Code: ${statusCode}`);
				} 
				else if(!/^application\/json/.test(contentType)) {
					error = new Error('Invalid content-type.\n' +
                      `Expected application/json but received ${contentType}`);
				}
		
				if (error) {
					console.error(error.message);
					// consume response data to free up memory
					res.resume();
					return;
				}
		
				//Reading data to be utf-8 instead of binary
				res.setEncoding('utf8');
	
				//Actual event for reading data.
				res.on('data', (d) =>{
					
					//Turns the response data into a JSON object
					var stockObj = JSON.parse(d);
					
					getEntryAndExit(stockObj,stockList,i);
				});
				
				
			
			});	
		
		},400);
		
		
		i++;
		//Recursive call to get all of the tickers
		getAPICall(i,stockList,msg);
		
		
	}
	else
	{
		//Do nothing
	}
	
}


/**
Functions no longer in use. Uncomment if needed.

//Same function as getAPICall(). Specialized for pre market
function getAPICallPre(i,stockList,msg)
{
	
	if(i < getNumberOfStocks() - 1)
	{

		setTimeout(function(){
			
			https.get("https://api.iextrading.com/1.0/stock/" + stockList[i]['Ticker'] + "/price", function(res){
				//What does this mean?
				const { statusCode } = res;
				const contentType = res.headers['content-type'];
		
				//Error handling
				let error;
				
				//If the resource 
				if (statusCode !== 200) {
					error = new Error('Request Failed.\n' +
                      `Status Code: ${statusCode}`);
				} 
				else if(!/^application\/json/.test(contentType)) {
					error = new Error('Invalid content-type.\n' +
                      `Expected application/json but received ${contentType}`);
				}
		
				if (error) {
					console.error(error.message);
					// consume response data to free up memory
					res.resume();
					return;
				}
		
				//Reading data to be utf-8 instead of binary
				res.setEncoding('utf8');
	
				//Actual event for reading data.
				res.on('data', (d) =>{
					
					var flag = true;
					var flag1 = true;
					
					if(stockList[i]['Entry'] === -1)
					{
						editJSONEntry(stockList, i);
						flag = false;
					}
					
					if(stockList[i]['Exit'] === -1)
					{
						editJSONExit(stockList, i);
						flag1 = false;
					}
					
					//If EntryGreater is set to true and the price is greater than both entry and exit prices, then it only triggers the exit alert.
					if(flag && flag1 && !stockList[i]['TriggeredExit'] && !stockList[i]['TriggeredEntry'] && stockList[i]['EntryGreater'] && d >= stockList[i]['Entry'] && d >= stockList[i]['Exit'])
					{
						client.channels.get(chatID).send("Pre-Market: " + stockList[i]['Ticker'] + " just hit exit of " + stockList[i]['Exit'] + " Move stop losses up to secure gains");
						editJSONEntry(stockList, i);
						editJSONExit(stockList, i);
						
					}
					
					//Checks if this ticker has been triggered for entry the price falls below the entry point. Should be set to false by default (Refer to data.json file for more information)
					if (flag && !stockList[i]['EntryGreater'] && !stockList[i]['TriggeredEntry'] && d <= stockList[i]['Entry']) {
				
					//Message
					client.channels.get(chatID).send("Pre-Market: " + stockList[i]['Ticker'] + " just hit entry of " + stockList[i]['Entry'] + " Place a stop loss near entry ~3-5%");
					//Since it has been triggered, this function indicates that this stock object has already been triggered for entry
					editJSONEntry(stockList, i);
					} 
					else 
					{
						//Do nothing
					}
					
					//Checks if this ticker has been triggered for entry the price exceeds entry point. Should be set to false by default (Refer to data.json file for more information)
					if (flag && stockList[i]['EntryGreater'] && !stockList[i]['TriggeredEntry'] && d >= stockList[i]['Entry']) {
				
					//Message
					client.channels.get(chatID).send("Pre-Market: " + stockList[i]['Ticker'] + " just hit entry of " + stockList[i]['Entry'] + " Place a stop loss near entry ~3-5%");
					//Since it has been triggered, this function indicates that this stock object has already been triggered for entry
					editJSONEntry(stockList, i);
					} 
					else 
					{
						//Do nothing
					}



					//Checks if this ticker has been triggered for exit. Should be set to false by default (Refer to data.json file for more information)
					if (flag1 && !stockList[i]['TriggeredExit'] && d >= stockList[i]['Exit']) {
				
						client.channels.get(chatID).send("Pre-Market: " + stockList[i]['Ticker'] + " just hit exit of " + stockList[i]['Exit'] + " Move stop losses up to secure gains");
						//Since it has been triggered, this function indicates that this stock object has already been triggered for exit
						editJSONExit(stockList, i);
					} 
					else 
					{
						//Do nothing
					}
				
					
					//Logging in link
					console.log("https://api.iextrading.com/1.0/stock/" + stockList[i]['Ticker']+ "/price" + ": " + d);
				});
				
				
			
			});	
		
		},300);
		
		
		i = i + 1;
		//Recursive call to get all of the tickers
		getAPICallPre(i,stockList,msg);
		
		
	}
	else
	{
		
	}
	
}

function getAPICallPost(i,stockList,msg)
{
	
	if(i < getNumberOfStocks() - 1)
	{

		setTimeout(function(){
			
			https.get("https://api.iextrading.com/1.0/stock/" + stockList[i]['Ticker'] + "/price", function(res){
				//What does this mean?
				const { statusCode } = res;
				const contentType = res.headers['content-type'];
		
				//Error handling
				let error;
				
				//If the resource 
				if (statusCode !== 200) {
					error = new Error('Request Failed.\n' +
                      `Status Code: ${statusCode}`);
				} 
				else if(!/^application\/json/.test(contentType)) {
					error = new Error('Invalid content-type.\n' +
                      `Expected application/json but received ${contentType}`);
				}
		
				if (error) {
					console.error(error.message);
					// consume response data to free up memory
					res.resume();
					return;
				}
		
				//Reading data to be utf-8 instead of binary
				res.setEncoding('utf8');
	
				//Actual event for reading data.
				res.on('data', (d) =>{
					
					var flag = true;
					var flag1 = true;
					
					if(stockList[i]['Entry'] === -1)
					{
						editJSONEntry(stockList, i);
						flag = false;
					}
					
					if(stockList[i]['Exit'] === -1)
					{
						editJSONExit(stockList, i);
						flag1 = false;
					}
					
					//If EntryGreater is set to true and the price is greater than both entry and exit prices, then it only triggers the exit alert.
					if(flag && flag1 && !stockList[i]['TriggeredExit'] && !stockList[i]['TriggeredEntry'] && stockList[i]['EntryGreater'] && d >= stockList[i]['Entry'] && d >= stockList[i]['Exit'])
					{
						client.channels.get(chatID).send("Post-Market: " + stockList[i]['Ticker'] + " just hit exit of " + stockList[i]['Exit'] + " Move stop losses up to secure gains");
						editJSONEntry(stockList, i);
						editJSONExit(stockList, i);
						
					}
					
					//Checks if this ticker has been triggered for entry the price falls below the entry point. Should be set to false by default (Refer to data.json file for more information)
					if (flag && !stockList[i]['EntryGreater'] && !stockList[i]['TriggeredEntry'] && d <= stockList[i]['Entry']) {
				
					//Message
					client.channels.get(chatID).send("Post-Market: " + stockList[i]['Ticker'] + " just hit entry price of " + stockList[i]['Entry'] + " Place a stop loss near entry ~3-5%");
					//Since it has been triggered, this function indicates that this stock object has already been triggered for entry
					editJSONEntry(stockList, i);
					} 
					else 
					{
						//Do nothing
					}
					
					//Checks if this ticker has been triggered for entry the price exceeds entry point. Should be set to false by default (Refer to data.json file for more information)
					if (flag && stockList[i]['EntryGreater'] && !stockList[i]['TriggeredEntry'] && d >= stockList[i]['Entry']) {
				
					//Message
					client.channels.get(chatID).send("Post-Market: " + stockList[i]['Ticker'] + " just hit entry price of " + stockList[i]['Entry'] + " Place a stop loss near entry ~3-5%");
					//Since it has been triggered, this function indicates that this stock object has already been triggered for entry
					editJSONEntry(stockList, i);
					} 
					else 
					{
						//Do nothing
					}



					//Checks if this ticker has been triggered for exit. Should be set to false by default (Refer to data.json file for more information)
					if (flag1 && !stockList[i]['TriggeredExit'] && d >= stockList[i]['Exit']) {
				
						client.channels.get(chatID).send("Post-Market: " + stockList[i]['Ticker'] + " just hit exit of " + stockList[i]['Exit'] + " Move stop losses up to secure gains");
						//Since it has been triggered, this function indicates that this stock object has already been triggered for exit
						editJSONExit(stockList, i);
					} 
					else 
					{
						//Do nothing
					}
				
					
					//Logging in link
					console.log("https://api.iextrading.com/1.0/stock/" + stockList[i]['Ticker']+ "/price" + ": " + d);
				});
				
				
			
			});	
		
		},300);
		
		
		i = i + 1;
		//Recursive call to get all of the tickers
		getAPICallPre(i,stockList,msg);
		
		
	}
	else
	{
		
	}
	
}
**/

//Takes in a json object and the index of which the stock object is located in the json file
function editJSONEntry(jsonObject, index) {
	
		//Change TriggeredEntry
		jsonObject[index]['TriggeredEntry'] = true;
	
    
    try {
        jsonObject = JSON.stringify(jsonObject, null, 4);
		
        fs.writeFileSync('data.json', jsonObject, 'utf8');
		
    } catch (err) {
        console.log(err);
    }

    return jsonObject;
}

function editJSONExit(jsonObject, index) {
	
		//Change TriggeredEntry
		jsonObject[index]['TriggeredExit'] = true;
	
    
    try 
	{
        jsonObject = JSON.stringify(jsonObject, null, 4);
		
        fs.writeFileSync('data.json', jsonObject, 'utf8');
		
    } catch (err) {
        console.log(err);
    }

    return jsonObject;
}

function convertCSVToJSON()
{
	
	csv().fromFile('Watchlist_Alert.csv').then((jsonObj) => {
	
	var str = JSON.stringify(jsonObj,null,4);
	
	fs.writeFileSync('data.json', str, 'utf8');
	
	});
	
}

function formatJSONFile()
{
	try
	{
        //Creates a json object 
        var stockList = JSON.parse(fs.readFileSync('data.json', 'utf8'));
            
	} 
	catch (err) 
	{
		msg.reply("Error: Check if data.json file exists and that the json file is in the correct format");
		console.log(err);
	}
	
	var flag = true;
	var count = 0;
	
	while(flag)
	{
		try
		{
			if(stockList[count]['EntryGreater'] === "TRUE")
			{
				stockList[count]['EntryGreater'] = true;
			}
			
			if(stockList[count]['EntryGreater'] === "FALSE")
			{
				stockList[count]['EntryGreater'] = false;
			}
			
			stockList[count]['TriggeredEntry'] = false;
			stockList[count]['TriggeredExit'] = false;
			
			str = JSON.stringify(stockList, null, 4);
			
			fs.writeFileSync('data.json', str, 'utf8');
			
		}
		catch(err)
		{
			flag = false;
		}
		
		count = count + 1;
	}
}

/**
Determines the number of stocks on data.json file.
**/
function getNumberOfStocks()
{
	try
	{
        //Creates a json object 
        var stockList = JSON.parse(fs.readFileSync('data.json', 'utf8'));
            
	} 
	catch (err) 
	{
		msg.reply("Error: Check if data.json file exists and that the json file is in the correct format");
		console.log(err);
	}
	
	var flag = true;
	var count = 0;
	
	while(flag)
	{
		try
		{
			stockList[count]['EntryGreater'];
		}
		catch(err)
		{
			flag = false;
		}
		
		count = count + 1;
	}
	
	return count - 1; 
}

/**
Determines the exit and entry 
**/
function getEntryAndExit(stockObj,stockList,i)
{
	//Flags to triggered exits and entries
	var flag = true;
	var flag1 = true;
					
	//In the watchlist, the entry is N/A
	if(stockList[i]['Entry'] === -1)
	{
		editJSONEntry(stockList, i);
		flag = false;
	}
					
	//In watchlist, the entry is N/A
	if(stockList[i]['Exit'] === -1)
	{
		editJSONExit(stockList, i);
		flag1 = false;
	}
					
	//If EntryGreater is set to true and the price is greater than both entry and exit prices, then it only triggers the exit alert.
	if(flag && flag1 && !stockList[i]['TriggeredExit'] && !stockList[i]['TriggeredEntry'] && stockList[i]['EntryGreater'] && stockObj['price'] >= stockList[i]['Entry'] && stockObj['price'] >= stockList[i]['Exit'])
	{
		var volume = getVolume(stockObj);
		
		client.channels.get(chatID).send(stockList[i]['Ticker'] + " just hit exit of " + stockList[i]['Exit'] + " Move stop losses up to secure gains." + volume);
		editJSONEntry(stockList, i);
		editJSONExit(stockList, i);
						
	}
					
	//Checks if this ticker has been triggered for entry the price falls below the entry point. Should be set to false by default (Refer to data.json file for more information)
	if (flag && !stockList[i]['EntryGreater'] && !stockList[i]['TriggeredEntry'] && stockObj['price'] <= stockList[i]['Entry']) 
	{
		var volume = getVolume(stockObj);
				
		//Message
		client.channels.get(chatID).send(stockList[i]['Ticker'] + " just hit entry price of " + stockList[i]['Entry'] + " Place a stop loss near entry ~3-5%." + volume);
		//Since it has been triggered, this function indicates that this stock object has already been triggered for entry
		editJSONEntry(stockList, i);
	} 
	else 
	{
	//Do nothing
	}
					
	//Checks if this ticker has been triggered for entry the price exceeds entry point. Should be set to false by default (Refer to data.json file for more information)
	if (flag && stockList[i]['EntryGreater'] && !stockList[i]['TriggeredEntry'] && stockObj['price'] >= stockList[i]['Entry']) {
				
		var volume = getVolume(stockObj);
		//Message
		client.channels.get(chatID).send(stockList[i]['Ticker'] + " just hit entry of " + stockList[i]['Entry'] + " Place a stop loss near entry ~3-5%." + volume);
		//Since it has been triggered, this function indicates that this stock object has already been triggered for entry
		editJSONEntry(stockList, i);
	} 
	else 
	{
	//Do nothing
	}

	//Checks if this ticker has been triggered for exit. Should be set to false by default (Refer to data.json file for more information)
	if (flag1 && !stockList[i]['TriggeredExit'] && stockObj['price'] >= stockList[i]['Exit']) {
				
		var volume = getVolume(stockObj);
		
		client.channels.get(chatID).send(stockList[i]['Ticker'] + " just hit exit of " + stockList[i]['Exit'] + " Move stop losses up to secure gains." + volume);
		//Since it has been triggered, this function indicates that this stock object has already been triggered for exit
		editJSONExit(stockList, i);
	} 
	else 
	{
		//Do nothing
	}
				
		//Logging in link
	console.log("https://api.iextrading.com/1.0/stock/" + stockList[i]['Ticker']+ "/price" + ": " + stockObj['price']);
}

/**
Gets volume in the last five minutes
**/
function getVolume(stockObj)
{
	var str = "";
	
	//For volume
	var count = 0;
	
	for(var i = 0; i<5;i++)
	{
		//If IEX doesn't provide data
		if(i === 1 && stockObj['chart'][i] === undefined)
		{
			str = " Insufficient Data To Determine Volume."
			return str;
		}
		
		if(stockObj['chart'][i] === undefined)
		{
			break;
		}
		
		count = count + stockObj['chart'][i]['volume'];
		
	}
	
	str = " Volume for past 5 minutes: " + count;
	
	return str;
}

/**
Returns the time in an array. 
Index 0 - The hour value. Range from 0 - 23
Index 1 - The minute value. Range from 0 - 59
Index 2 - The second value. Range from 0 - 59
**/
function getTimeInHoursAndMinutes()
{
	var dt = datetime.create();
	var formatted = dt.format('H:M:S');

	formatted = formatted + ":";
	
	var tmpStr = "";
	var array = [];
	
	for(var i = 0; i < formatted.length; i++)
	{
		if(formatted.charAt(i) === ':')
		{
			array.push(tmpStr);
			tmpStr = "";
		}
		else
		{
			tmpStr = tmpStr + formatted.charAt(i);
		}
	}

	var hour = parseInt(array[0]);
	var minute = parseInt(array[1]);
	var second = parseInt(array[2]);

	array[0] = hour;
	array[1] = minute;
	array[2] = second; 
	
	return array;
}

//Put token here
client.login("");