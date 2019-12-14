// ==UserScript==
// @name         HFYmod-analysis
// @namespace    http://tampermonkey.net/
// @version      0.1.7
// @description  A tool for analysing Reddit's HFY story submissions
// @author       /u/sswanlake
// @match        *.reddit.com/r/HFY/comments/*
// @match        *.reddit.com/r/hfy/comments/*
// @updateURL    https://github.com/sswanlake/HFYmod-Analysis/raw/master/HFYmod-Analysis.user.js
// @grant        none
// @require      https://cdn.plot.ly/plotly-latest.min.js
// ==/UserScript==

//previously: added total wordcount, and average words per day
//what's new: if length<1 deleted, if you upvoted add ^, improved othersite detection, graph words/10 (for better scaling)
//todo: wordcount from other hosting sites

(function() {
    'use strict';

    jQuery.fn.modalbackground = function () {
        this.css("display","none");
        this.css("position", "fixed");
        this.css("padding-top", "100px");
        this.css("padding-bottom", "100px");
        this.css("left", "0");
        this.css("top", "0");
        this.css("width", "100%");
        this.css("height", "100%");
        this.css("overflow", "auto"); //overflow-y
        this.css("background-color", "rgb(0,0,0)");
        this.css("background-color", "rgba(0,0,0,0.4)");
        this.css("font-size", "120%");
        this.css("z-index", "999");
        return this;
    }; //css modal background

    jQuery.fn.modalInside = function () {
        this.css("background-color", "#fefefe");
        this.css("color", "#000000");
        this.css("margin", "auto");
        this.css("padding", "15px");
        this.css("padding-bottom", "100px");
        this.css("border", "1px solid #888");
        this.css("width", "80%");
        this.css("overflow-y", "initial");
	    return this;
    }; //css modal-content

    function timeConvert(UNIX_timestamp) {
        var a = new Date(UNIX_timestamp * 1000);
        var year = a.getFullYear();
        var month = (`0${a.getUTCMonth() + 1}`).slice(-2);
        var date = (`0${a.getUTCDate()}`).slice(-2);
        var hour = (`0${a.getUTCHours()}`).slice(-2);
        var min = (`0${a.getUTCMinutes()}`).slice(-2);
        var sec = (`0${a.getUTCSeconds()}`).slice(-2);
        return `${month}-${date}-${year} ${hour}:${min}:${sec}`;
    } //make dates human readable

    String.prototype.toProperCase = function () {
        return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }; //capitalize first letter of given string

    function cleanArray(actual) {
        var newArray = new Array();
        for (var i = 0; i < actual.length; i++) {
            if (actual[i]) {
                newArray.push(actual[i]);
            }
        }
        return newArray;
    }; // Will remove all falsy values: undefined, null, 0, false, NaN and "" (empty string)

    var seriesCounter = 0;
    var getFromBetween = {
        results:[],
        string:"",
        getFromBetween:function (sub1,sub2) {
            if(this.string.indexOf(sub1) < 0 || this.string.indexOf(sub2) < 0) return false;
            var SP = this.string.indexOf(sub1)+sub1.length;
            var string1 = this.string.substr(0,SP);
            var string2 = this.string.substr(SP);
            var TP = string1.length + string2.indexOf(sub2);
            return this.string.substring(SP,TP);
        },
        removeFromBetween:function (sub1,sub2) {
            if(this.string.indexOf(sub1) < 0 || this.string.indexOf(sub2) < 0) return false;
            var removal = sub1+this.getFromBetween(sub1,sub2)+sub2;
            this.string = this.string.replace(removal,"");
        },
        getAllResults:function (sub1,sub2) {
            // first check to see if we do have both substrings
            if(this.string.indexOf(sub1) < 0 || this.string.indexOf(sub2) < 0) return;

            // find one result
            var result = this.getFromBetween(sub1,sub2);
            // push it to the results array
            this.results.push(" [" + result + "], &nbsp;");
            seriesCounter++;
            // remove the most recently found one from the string
            this.removeFromBetween(sub1,sub2);

            // if there's more substrings
            if(this.string.indexOf(sub1) > -1 && this.string.indexOf(sub2) > -1) {
                this.getAllResults(sub1,sub2);
            }
            else return;
        },
        get:function (string,sub1,sub2) {
            this.results = [];
            this.string = string;
            this.getAllResults(sub1,sub2);
            return this.results;
        }
    }; //get all substrings between two characters/strings //var result = getFromBetween.get(Contents,"(",")");

//---------------------------------------------------------------------------------------------

    $(document).ready(function(){
        var author = $(".author")[12].innerHTML; //the array=12 instance of the class "author". 0=you, 1=adamwizzy, 2-11=mods, 12=author, 13=first commenter, etc.

        var AnalysisBtn = $('<button id="AnalysisBtn" title="Analyze the author\'s submissions to HFY, totally not for evil purposes">Analysis <span id="pages"></span></button>'); //id="myModal2"
        var AnalysisBtnContent = $(`
<div class="modalbackground">
    <div class="modalInside">
        <span class="AnalysisClose" style="float:right; font-size:28px; font-weight:bold; cursor: pointer;">&times;</span>
        <p style="font-size: 200%" id="username"><a href="https://www.reddit.com/user/${author}" target="_blank">/u/${author}</a></p>
        <p><span id="totalSubmissions2" style="font-weight:bold; color:#0087BD;"></span> total submissions, <span id="hfycount2" style="font-weight:bold; color:#0087BD"></span> of which are in HFY</p>
                    <p style="float:right"><span id="thisyear" style="color:red">0</span> stories in the last 365 days | <span id="modremovedcount2" style="color:red"></span> have been mod removed</p>
        <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Of those, <span id="storycount2" style="font-weight:bold; color:#0087BD"></span> are stories and <span id="metacount2" style="font-weight:bold; color:#0087BD"></span> are other submissions</p>
                    <p style="float:right"><span id="shortcount2" style="color:orange;background:linen">0</span> stories are less than 1000 char long</p>
        <p>avg score: <span id="avgscore" style="color: red">will</span> | avg # comments: <span id="avgcomments" style="color:tomato">BOO</span> | ttl words: <span id="ttlwords" style="color: orange">this</span> | avg pages: <span id="avglength" style="color: green">this</span> | ttl pages: <span id="totallength" style="color:green">actually</span> | avg days b/w: <span id="avgDaysBetw" style="color:blue">work</span><span id="boop"></span> | days since latest: <span id="currentDays" style="color:DarkViolet">now?</span> | days since first: <span id="FirstDays" style="color:DarkViolet">...Ok</span> | avg words/day: <span id="wordsperday" style="color:#0087BD">...Ok</span> | <span id="NSFWcount2" style="color:red">grr</span> are <em style="background:Salmon; color:white">NSFW</em></p>
        <p><span style="font-weight:bold">Max/Min:</span> <span style="color:red">Score:</span> <span id="scoremax">000</span>/ <span id="scoremin">000</span> | <span style="color:tomato">#Comments:</span> <span id="commMax">000</span>/ <span id="commMin">000</span> | <span style="color:orange">Words:</span> <span id="wordmax"></span>/ <span id="wordmin"></span>| <span style="color:green">Pages:</span> <span id="lengthmax">000</span>/ <span id="lengthmin">000</span> | <span style="color:blue">Days b/w:</span> <span id="daysmax">000</span>/ <span id="daysmin">000</span></p>
        <hr/>
        <p><strong style="font-size: 150%">WIKI:</strong> <a href="https://www.reddit.com/r/HFY/wiki/authors/${author}" target="_blank" style="font-size: 150%">${author}</a>  &nbsp; &nbsp; <span id="existsYN"></span>  &nbsp; &nbsp; <a onclick="$('.authorpage').toggle()">hide author</a></p>
        <p><b>Existing Series Pages:</b> <span id="NumSerAnalasis" style="color:navy; background-color:lightgreen"></span><span id="NGRAM" style="color:forestgreen"></span></p>
        <p>&nbsp;</p>
        <b><table><tr><td style="width:30px;">&nbsp;# </td><td style="width:400px;">Title </td><td style="width:25px;">flair </td><td style="width:35px;">&nbsp;arc? </td><td style="width:140px;">Date </td><td style="width:70px;">Score </td><td style="width:55px">Comm.</td><td style="width:55px;">Chars </td><td style="width:55px;">Words </td><td style="width:55px;">Pages </td><td>Days Between </td></tr></table></b>
        <div class="authorpage" id="authorpage" style="border:1px solid gray; background:Lavender; height:600px; overflow-y:auto; overflow-x:auto;">
        <table class="boop"><span id="stories2"></span></table>
        <p>&nbsp;</p>
        </div>
        <p>&nbsp;</p>
        <div id="modalGraph">
            <button id="graphBtn"> MAKE GRAPH </button> set latest days to <a id="setzero" style="color:white;background:Silver;border: outset lightblue; cursor:pointer;">Zero</a><a id="sethigh" style="color:white;background:Gray;border: outset lightblue; cursor:pointer;">Current</a>
                <div id="graph1">
                </div>
        </div>
    </div>
</div>
`); //width:30px # - width:400px Title - width:140px Date - width:70px Score - width:55px Comments - width:55px Chars - width:55px Words - width:55px Pages - Days Between



        //add in the button and its contents and format css elements
        $(".expando").prepend(AnalysisBtn);
        $("body").append(AnalysisBtnContent);
        $(".modalbackground").modalbackground();
        $(".modalInside").modalInside();

        $("#AnalysisBtn").click(function() {
            $(".modalbackground").css("display","block");
            $('body').css("overflow", "hidden");
        }); // When the user clicks the button, open the modal

        $('.AnalysisClose')[0].onclick = function() {
            $('.modalbackground').css("display","none");
            $('body').css("overflow", "auto");
        }; // When the user clicks on <span> (x), close the modal

        window.onclick = function(event) {
            if (event.target == $('.modalbackground')[0]) {
                $('.modalbackground').css("display","none");
                $('body').css("overflow", "auto");
            } //for Analysis
            if (event.target == $('.modal')[0]) {
                $('.modal').css("display","none");
                $('body').css("overflow", "auto");
            } //for WikiTool because reasons (only one "onclick" command is allowed at a time, so you have to check for both)
        }; // close the modal if the user clicks outside the modal content

        //getting the json with the information
        var lastID = null;
        var totalSubmissions2 = 0;
        var hfycount2 = 0;
        var storycount2 = 0;
        var NSFWcount2 = 0;

        var modremovedcount2 = 0;

        var CurrentDays;
        var FirstDays;
        var thisyear = 0;
        var shortcount2 = 0;

        var commentsarray = [0];
        var scorearray = [0];
        var lengtharray = [0]; //in characters
        var datearray = [0];
        var dateDifArray = [0];
        var wordarray = [0];

        function load(after) {
            $.getJSON(`https://www.reddit.com/user/${author}/submitted.json?sort=new&after=${after}`, function (foo) {
                $.each(foo.data.children, function (i, post) {
                    if (post.data.subreddit == "HFY"){
                        hfycount2++;
                        var flair = post.data.link_flair_css_class;
                        var short2 = "";
                        if ( !((flair == "META") || (flair == "Text") || (flair == "Misc") || (flair == "Video") || (post.data.link_flair_text == "WP") ) ){ //|| (flair == "WP") //WP needs a special case because reasons. Meta used to be META. There used to be an "OC Oneshot" flair. Also, there used to be a "meta mod" flair

                            var date = timeConvert(post.data.created_utc);
                            if (post.data.selftext.length > 1) {
                                var leng = (post.data.selftext).replace(/(?:\r\n|\r|\n)/g, '').length; //remove all linebreaks .match(/([\s]+)/g).length
                                var spaces = (post.data.selftext).replace(/(?:\r\n|\r|\n)/g, ' ').match(/([\s]+)/g).length;
                            } else {leng=0; spaces=0;} //count number of spaces (theoretically number of words)
                            if (spaces < 350) {short2 = "~SHORT~"; shortcount2++;}; // for low word count
                            var storytitle = (post.data.title).replace(`[OC]`, '').replace(`[oc]`, '').replace(`(OC)`, '').replace(`[PI]`, '').trim()
//                            var shortlink = `https://redd.it/${post.data.id}`;

                            var other = "";
                            var othersite = [`deathworlders.com`, `hfy-archive.org`, `arkmuse.org`, `docs.google.com`, `www.royalroad`];
                            if ( othersite.some(substring=>post.data.selftext.includes(substring)) ) {
                                other += othersite.filter(substring=>post.data.selftext.includes(substring));
                            }; //end if includes any one of the links to common other sites

                            if ((!post.data.removed) && (!post.data.banned_by)){
                                FirstDays = ((Date.now() /1000) - post.data.created_utc) / (60 * 60 * 24);
                                $("#FirstDays").html(`${FirstDays.toFixed(2)}`);
                                if (FirstDays <= 365) {
                                    thisyear++;
                                    $("#thisyear").html(`${thisyear}`);
                                };
                                storycount2++;

                                var liked = "";
                                if (post.data.likes) {
                                    liked = "^";
                                } else if (post.data.likes == false) {
                                    liked = "&#8964;" //downwards ^
                                };

                                scorearray[storycount2] = post.data.score;
                                lengtharray[storycount2] = leng;
                                wordarray[storycount2] = spaces;
                                commentsarray[storycount2] = post.data.num_comments;
                                datearray[storycount2] = post.data.created_utc;
                                dateDifArray[storycount2] = Math.abs( (post.data.created_utc - datearray[storycount2-1]) / (60 * 60 * 24) ); //is in days
                                CurrentDays = ((Date.now() /1000) - datearray[1]) / (60 * 60 * 24);
                                $("#currentDays").html(`${CurrentDays.toFixed(2)}`);
                                if (dateDifArray[storycount2] >= 10000) {
//                                    dateDifArray[storycount2] = 0;
                                    dateDifArray[storycount2] = CurrentDays; //add to graphs an' stuff
                                } //fix first eronious one, to make the numbers nice

                            //width:30px # - width:400px Title - width:140px Date - width:70px Score - width:55px Comments - width:55px Chars - width:55px Words - width:55px Pages - width:55px Days Between - Hosted On
                                if (post.data.over_18) {
                                    $("#stories2").prepend( `<tr style="color:darkred"><td style="width:30px;">${storycount2}&nbsp;</td>
                                                                    <td style="width:400px;"><b style="color:orange; background:peachpuff">${short2}</b>${liked}[<a style="color:DarkSlateBlue" href="${post.data.url}" title="flair: ${post.data.link_flair_text}">${storytitle}</a>] <emphasis style="color:red;">*NSFW*</emphasis>&nbsp;</td>
                                                                    <td style="width:25px;">${post.data.link_flair_text}&nbsp;</td>
                                                                    <td style="width:35px;">${post.data.archived}&nbsp;</td>
                                                                    <td style="width:140px;">${date}&nbsp;</td>
                                                                    <td style="width:70px;">score:${post.data.score}&nbsp;</td>
                                                                    <td style="width:55px;color:red">${commentsarray[storycount2]}&nbsp;</td>
                                                                    <td style="width:55px;">${leng}<b style="color:orange; background:peachpuff">${short2}</b>&nbsp;</td>
                                                                    <td style="width:55px;">${spaces}&nbsp;</td>
                                                                    <td style="width:55px;">${(leng/2000).toFixed(1)}&nbsp;</td>
                                                                    <td style="width:55px;color:indianred">&#8964;${dateDifArray[storycount2].toFixed(3)}&nbsp;</td>
                                                                    <td>${other}&nbsp;</td></tr>` );
                                    NSFWcount2++;
                                } else {
                                    $("#stories2").prepend( `<tr><td style="width:30px;">${storycount2}&nbsp;</td>
                                                                    <td style="width:400px;"><b style="color:orange; background:peachpuff">${short2}</b>${liked}[<a href="${post.data.url}" title="flair: ${post.data.link_flair_text}">${storytitle}</a>]&nbsp;</td>
                                                                    <td style="width:25px;">${post.data.link_flair_text}&nbsp;</td>
                                                                    <td style="width:35px;">${post.data.archived}&nbsp;</td>
                                                                    <td style="width:140px;color:blue">${date}</span>&nbsp;</td>
                                                                    <td style="width:70px;">score:${post.data.score}&nbsp;</td>
                                                                    <td style="width:55px;color:orange">${commentsarray[storycount2]}&nbsp;</td>
                                                                    <td style="width:55px;color:green">${leng}<b style="color:orange; background:peachpuff">${short2}</b></td>
                                                                    <td style="width:55px;color:green">${spaces}&nbsp;</td>
                                                                    <td style="width:55px;color:green">${(leng/2000).toFixed(1)}&nbsp;</td>
                                                                    <td style="width:55px;color:purple">&#8964;${dateDifArray[storycount2].toFixed(3)}&nbsp;</td>
                                                                    <td>${other}&nbsp;</td></tr>` );
                                } //most things will be this
                            } else {
                                modremovedcount2++;
                                hfycount2--;
                                if (post.data.over_18) {
                                    $("#stories2").prepend( `<tr style="color:sienna"><td style="width:30px;">${modremovedcount2}&nbsp;</td>
                                                                    <td style="width:400px"><b style="color:orange; background:peachpuff">${short2}</b>[<a style="color:sienna" href="${post.data.url}" title="flair: ${post.data.link_flair_text}">${storytitle}</a>] <emphasis style="color:red;">*NSFW*</emphasis>&nbsp;</td>
                                                                    <td style="width:25px;">${post.data.link_flair_text}&nbsp;</td>
                                                                    <td style="width:35px;">${post.data.archived}&nbsp;</td>
                                                                    <td style="width:140px">${date}&nbsp;</td>
                                                                    <td style="width:70px">score:${post.data.score}&nbsp;</td>
                                                                    <td style="width:55px">${commentsarray[storycount2]}&nbsp;</td>
                                                                    <td style="width:55px">${leng}<b style="color:orange; background:peachpuff">${short2}</b>&nbsp;</td>
                                                                    <td style="width:55px">${spaces}&nbsp;</td>
                                                                    <td style="width:55px">${(leng/2000).toFixed(1)}&nbsp;</td>
                                                                    <td style="width:55px">&#8964;${dateDifArray[storycount2].toFixed(3)}&nbsp;</td>
                                                                    <td>${other}&nbsp;</td></tr>` );
                                } else {
                                    $("#stories2").prepend( `<tr style="color:orange"><td style="width:30px;">${modremovedcount2}&nbsp;</td>
                                                                    <td style="width:400px"><b style="color:orange; background:peachpuff">${short2}</b>[<a style="color:orange" href="${post.data.url}" title="flair: ${post.data.link_flair_text}">${storytitle}</a>]&nbsp;</td>
                                                                    <td style="width:25px;">${post.data.link_flair_text}&nbsp;</td>
                                                                    <td style="width:35px;">${post.data.archived}&nbsp;</td>
                                                                    <td style="width:140px;">${date}</span>&nbsp;</td>
                                                                    <td style="width:70px">score:${post.data.score}&nbsp;</td>
                                                                    <td style="width:55px;color:coral">${commentsarray[storycount2]}&nbsp;</td>
                                                                    <td style="width:55px">${leng}<b style="color:orange; background:peachpuff">${short2}</b>&nbsp;</td>
                                                                    <td style="width:55px">${spaces}&nbsp;</td>
                                                                    <td style="width:55px">${(leng/2000).toFixed(1)}&nbsp;</td>
                                                                    <td style="width:55px">&#8964;${dateDifArray[storycount2].toFixed(3)}&nbsp;</td>
                                                                    <td>${other}&nbsp;</td></tr>` );
                                } //end if NSFW
//                                storycount2--;
                            }; //end if modremoved
                        } //end if OC/PI
                    } //end if HFY

                    //-------Update Numbers:-----------------------
                    $('#hfycount2').html(`${hfycount2}`);
                    $('#storycount2').html(`${storycount2}`);
                    $('#metacount2').html(`${hfycount2 - storycount2}`);
                    $('#NSFWcount2').html(`${NSFWcount2}`); //update numbers of totaled things
                    var cleanDif = cleanArray(dateDifArray); //removes zeroes
                    $("#avgDaysBetw").html(`${(cleanDif.reduce((a,b) => a + b, 0) /storycount2).toFixed(2)}`);
                    $('#avgscore').html(`${(scorearray.reduce((a,b) => a + b, 0) /storycount2).toFixed(2)}`);
                    $('#avgcomments').html(`${(commentsarray.reduce((a,b) => a + b, 0) /storycount2).toFixed(1)}`); //summed then divided for avg
                    $('#ttlwords').html(`${(wordarray.reduce((a,b) => a + b, 0))}`);
                    $('#avglength').html(`${((lengtharray.reduce((a,b) => a + b, 0)/2000)/storycount2).toFixed(2)}`);  //1 page is 2000 characters
                    $('#totallength').html(`${(lengtharray.reduce((a,b) => a + b, 0)/2000).toFixed(2)}`); //1 page is 2000 characters
                    $('#wordsperday').html(`${(wordarray.reduce((a,b) => a + b, 0)/FirstDays).toFixed(2)}`);
                    $('#modremovedcount2').html(`${modremovedcount2}`);
                    $('#shortcount2').html(`${shortcount2}`);
                }); //end each

                if (foo.data.children && foo.data.children.length > 0) {
                    lastID = foo.data.children[foo.data.children.length - 1].data.name;
                    totalSubmissions2 += foo.data.children.length;
                    $('#totalSubmissions2').html(`${totalSubmissions2-modremovedcount2}`);
                    load(lastID);
                }; //end if no posts (this is what causes the loop)
            }) //end getJSON
              .done(function() {

                var scoremin = scorearray.filter(function(x){ return x> 0;}).sort(function(a,b){ return a>b; })[0];
                var commentsmin = commentsarray.filter(function(x){ return x> 0;}).sort(function(a,b){ return a>b; })[0];
                var lengthmin = lengtharray.filter(function(x){ return x> 0; }).sort(function(a,b){ return a>b; })[0];
                var datemin = dateDifArray.filter(function(x){ return x> 0; }).sort(function(a,b){ return a>b; })[0];
                var wordmin = wordarray.filter(function(x){ return x> 0; }).sort(function(a,b){ return a>b; })[0];

                $('#scoremax').html(Math.max( ...scorearray));
                $('#scoremin').html(scoremin);
                $('#commMax').html(Math.max( ...commentsarray));
                $('#commMin').html(commentsmin);
                $('#lengthmax').html((Math.max( ...lengtharray) /2000).toFixed(2));
                $('#lengthmin').html((lengthmin/2000).toFixed(2));
                $('#wordmax').html((Math.max( ...wordarray)));
                $('#wordmin').html(wordmin);
                $('#daysmax').html(Math.max( ...dateDifArray).toFixed(2));
                $('#daysmin').html(datemin.toFixed(3)); //dateDifArray.filter(Boolean)

                $.getJSON(`https://www.reddit.com/r/HFY/wiki/authors/${author}.json`, function (bar) {
                    var Contents = bar.data.content_md.toLowerCase();
                    seriesCounter = 0;
                    var result2 = getFromBetween.get(Contents,"/r/hfy/wiki/series/",")");
                    $("#NGRAM").html(result2); //overwrites the suggested series area, but that's legacy for being slow
                    $("#NumSerAnalasis").html(seriesCounter);
                }); //end getJSON

            }) //end done getJSON (add in max/min)
            .error(function() {
                if (author == "[deleted]") {
                    $("#stories2").append( `<span style="color:red">ERROR - ACCOUNT DELETED</span>`);
                } else {
                    $("#stories2").append( `<span style="color:red">ERROR ... Shadowbanned?</span>`);
                }
            }); //end error getJSON

        } //end load

        load(lastID);
        var meh = $(".expando").text().replace(/(?:\r\n|\r|\n)/g, '').length;
        $("#pages").html( `- ${(meh/2000).toFixed(2)} pages`); //length of current page, printed on the button

        //graphing!
        var graphData;
        var layout1;
        $('#graphBtn').click(function() {
            var pageArray = [0];
            for (var x = 0, l = lengtharray.length; x < l; x++) {
                pageArray[x] = wordarray[x] / 10;
            } //divides each entry by 2000, and stores the result in pageArray

            var table = document.getElementsByClassName('boop')[0],
                rows = table.rows,
                text = 'textContent' in document ? 'textContent' : 'innerText';

            for (var i = 0, len = rows.length; i < len; i++){
                rows[i].children[0][text] = i + ': ' + rows[i].children[0][text];
            }

            var graphDataTrace1 = {
                x: scorearray.length,
                y: scorearray,
                type: 'scatter',
                name: 'Score over time'
            }

            var graphDataTrace2 = {
                x: lengtharray.length,
                y: pageArray,
                type: 'scatter',
                name: 'Words/10 over time'
            }

            var graphDataTrace3 = {
                x: dateDifArray.length,
                y: dateDifArray,
                type: 'scatter',
                name: 'days between over time'
            }

            var graphDataTrace4 = {
                x: commentsarray.length,
                y: commentsarray,
                type: 'scatter',
                name: 'number of comments over time'
            }

            graphData = [graphDataTrace1, graphDataTrace2, graphDataTrace3, graphDataTrace4];

            layout1 = {
                yaxis: {rangemode: 'tozero',
                        showline: true,
                        zeroline: true},
                xaxis: {autorange:'reversed'}
            };

            Plotly.newPlot('graph1', graphData, layout1);
        });

//-----------------------Toggle------------------------------

        $('#setzero')[0].onclick = function() {
            dateDifArray[1] = 0;
            $('#setzero').css("background-color", "Gray")
            $('#sethigh').css("background-color", "Silver")

            Plotly.newPlot('graph1', graphData, layout1); //replot
            $('#daysmax').html(Math.max( ...dateDifArray).toFixed(2));
        }; //end set zero

        $('#sethigh')[0].onclick = function() {
            dateDifArray[1] = CurrentDays;
            $('#setzero').css("background-color", "Silver")
            $('#sethigh').css("background-color", "Gray")

            Plotly.newPlot('graph1', graphData, layout1); //replot
            $('#daysmax').html(Math.max( ...dateDifArray).toFixed(2));
        }; //end set high

    }); //document ready
})();
