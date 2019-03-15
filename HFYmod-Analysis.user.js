// ==UserScript==
// @name         HFYmod-analysis
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  A tool for analysing Reddit's HFY story submissions
// @author       /u/sswanlake
// @match        *.reddit.com/r/HFY/comments/*
// @updateURL    https://github.com/sswanlake/HFYmod-Analysis/raw/master/HFYmod-Analysis.user.js
// @grant        none
// @require      https://cdn.plot.ly/plotly-latest.min.js
// ==/UserScript==

//previously: fixed Days Between results, indent title, numbers on graph match story number
//what's new: days since last chapter, shows if removed, MinMax, chars

(function() {
    'use strict';

    jQuery.fn.modal = function () {
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
        return this;
    }; //css modal

    jQuery.fn.modalContent = function () {
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

    (function($){$.fn.innerText = function(msg) {
        if (msg) {
            if (document.body.innerText) {
                for (var i in this) {
                    this[i].innerText = msg;
                }
            } else {
                for (var j in this) {
                    this[j].innerHTML.replace(/&amp;lt;br&amp;gt;/gi,"n").replace(/(&amp;lt;([^&amp;gt;]+)&amp;gt;)/gi, "");
                }
            }
            return this;
        } else {
            if (document.body.innerText) {
                return this[0].innerText;
            } else {
                return this[0].innerHTML.replace(/&amp;lt;br&amp;gt;/gi,"n").replace(/(&amp;lt;([^&amp;gt;]+)&amp;gt;)/gi, "");
            }
        }
    }; })(jQuery); //select inner text

    function cleanArray(actual) {
        var newArray = new Array();
        for (var i = 0; i < actual.length; i++) {
            if (actual[i]) {
                newArray.push(actual[i]);
            }
        }
        return newArray;
    }; // Will remove all falsy values: undefined, null, 0, false, NaN and "" (empty string)

    $(document).ready(function(){
        var author = $(".author")[12].innerHTML; //the array=12 instance of the class "author". 0=you, 1=adamwizzy, 2-11=mods, 12=author, 13=first commenter, etc.

        var Btn2 = $('<button id="myBtn2" title="Analyze the author\'s submissions to HFY, totally not for evil purposes">Analysis <span id="pages"></span></button>');
        var BtnContent2 = $(`
<div id="myModal2" class="modal2" style="font-size: 120%;" >
    <div class="modal-content2">
        <span class="close2" style="float:right; font-size:28px; font-weight:bold; cursor: pointer;">&times;</span>
        <p style="font-size: 200%" id="username"><a href="https://www.reddit.com/user/${author}" target="_blank">/u/${author}</a></p>
        <p><span id="totalSubmissions2" style="font-weight:bold; color:#0087BD;"></span> total submissions, <span id="hfycount2" style="font-weight:bold; color:#0087BD"></span> of which are in HFY</p>
        <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Of those, <span id="storycount2" style="font-weight:bold; color:#0087BD"></span> are stories and <span id="metacount2" style="font-weight:bold; color:#0087BD"></span> are other submissions</p>
        <p>avg score: <span id="avgscore" style="color: red">will</span> | avg pages: <span id="avglength" style="color: orange">this</span> | ttl pages: <span id="totallength" style="color:green">actually</span> | avg days b/w: <span id="avgDaysBetw" style="color:blue">work</span><span id="boop"></span> | days since last: <span id="currentDays" style="color:DarkViolet">now?</span> | <span id="NSFWcount2" style="color:red"></span> are <em style="background:Salmon; color:white">NSFW</em></p>
        <p><span style="font-weight:bold">Max/Min:</span> <span style="color:red">Score:</span> <span id="scoremax">000</span>/ <span id="scoremin">000</span> | <span style="color:green">Pages:</span> <span id="lengthmax">000</span>/ <span id="lengthmin">000</span> | <span style="color:blue">Days:</span> <span id="daysmax">000</span>/ <span id="daysmin">000</span></p>
        <hr/>
        <p><strong style="font-size: 150%">WIKI:</strong> <a href="https://www.reddit.com/r/HFY/wiki/authors/${author}" target="_blank" style="font-size: 150%">${author}</a>  &nbsp; &nbsp; <span id="existsYN"></span>  &nbsp; &nbsp; <a onclick="$('.authorpage').toggle()">hide author</a></p>
        <p>&nbsp;</p>
        <b><table><tr><td style="width:30px;">&nbsp;# </td><td style="width:400px;">Title </td><td style="width:140px;">Date </td><td style="width:70px;">Score </td><td style="width:55px;">Chars </td><td style="width:55px;">Words </td><td style="width:55px;">Pages </td><td>Days Between </td></tr></table></b>
        <div class="authorpage" id="authorpage" style="border:1px solid gray; background:Lavender; height:250px; overflow-y:auto; overflow-x:auto;">
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
`); //td style="border: solid 1px gray;" //#0087BD; /*NSC Blue (gray-ish aqua)*/
//<td style="width:80px;">Views </td><td style="width:60px;">V-to-V</td>


        //add in the button and its contents and format css elements
        $(".expando").prepend(Btn2);
        $("body").append(BtnContent2);
        $(".modal2").modal();
        $(".modal-content2").modalContent();

        $("#myBtn2").click(function() {
            $(".modal2").css("display","block");
            $('body').css("overflow", "hidden");
        }); // When the user clicks the button, open the modal

        $('.close2')[0].onclick = function() {
            $('.modal2').css("display","none");
            $('body').css("overflow", "auto");
        }; // When the user clicks on <span> (x), close the modal

        window.onclick = function(event) {
            if (event.target == $('.modal2')[0]) {
                $('.modal2').css("display","none");
                $('body').css("overflow", "auto");
            }
        }; // close the modal if the user clicks outside the modal content

        //getting the json with the information
        var lastID = null;
        var counter = 0;
        var totalSubmissions2 = 0;
        var hfycount2 = 0;
        var storycount2 = 0;
        var metacount2 = 0;
        var NSFWcount2 = 0;
        var modremovedcount2 = 0;

        var CurrentDays;

        var totscore = 0;
        var avgscore = 0;
        var totleng = 0;
        var avgleng = 0;

        var scorearray = [0];
        var lengtharray = [0]; //in characters
        var datearray = [0];
        var dateDifArray = [0];
        var arrayarray = [0]; //incremented list, for the X axis of the graph

        function load(after) {
            $.getJSON(`https://www.reddit.com/user/${author}/submitted.json?sort=new&after=${after}`, function (foo) {
                var children = foo.data.children;
                var date;
                var storytitle;
                $.each(children, function (i, post) {
                    if (post.data.subreddit == "HFY"){
                        date = timeConvert(post.data.created_utc);
                        hfycount2++;
                        var flair = post.data.link_flair_css_class;
                        var leng = (post.data.selftext).replace(/(?:\r\n|\r|\n)/g, '').length; //remove all linebreaks .match(/([\s]+)/g).length
                        var spaces = (post.data.selftext).replace(/(?:\r\n|\r|\n)/g, ' ').match(/([\s]+)/g).length; //count number of spaces (theoretically number of words)
                        storytitle = (post.data.title).replace(`[OC]`, '').replace(`(OC)`, '').replace(`[PI]`, '').trim()
                        if ((post.data.link_flair_css_class == "OC") || (post.data.link_flair_text == "PI") || (post.data.link_flair_css_class == null)){ //WP is the class of current PI, but... that's messy
                            storycount2++;
                            datearray[storycount2] = post.data.created_utc;
                            dateDifArray[storycount2] = Math.abs( (post.data.created_utc - datearray[storycount2-1]) / (60 * 60 * 24) ); //is in days
                                CurrentDays = ((Date.now() /1000) - datearray[1]) / (60 * 60 * 24);
                                $("#currentDays").html(`${CurrentDays.toFixed(2)}`);
                            if (dateDifArray[storycount2] >= 10000) {
//                                dateDifArray[storycount2] = 0;
                                dateDifArray[storycount2] = CurrentDays; //add to graphs an' stuff
                            } //remove first eronious one, to make the numbers nice

                            if ( (post.data.selftext).includes(`](https://arkmuse.org/threads`) ) {
                                leng = 0; //"|text to get| Other text.... migh have \"|\"'s ...".match(/\|(.*?)\|/)
                            };

                            //width:30px # - width:400px Title - width:140px Date - width:70px Score - width:55px Chars - width:55px Words - width:55px Pages - Days Between
                            if ((!post.data.removed) && (!post.data.banned_by)){
                                if (post.data.over_18) {
                                    $("#stories2").prepend( `<tr><td style="width:30px;">${storycount2}&nbsp;</td>
                                                                    <td style="width:400px;width:400px;padding-left:15px;text-indent:-15px;"><label> [<a style="color:DarkSlateBlue" href="${post.data.url}" title="flair: ${post.data.link_flair_text}">${storytitle}</a>] <emphasis style="color:red;">*NSFW*</emphasis>\n</label>&nbsp;</td>
                                                                    <td style="width:140px;color:purple">${date}&nbsp;</td>
                                                                    <td style="width:70px;color:darkred">score:${post.data.score}&nbsp;</td>
                                                                    <td style="width:55px;color:darkred">${leng}&nbsp;</td>
                                                                    <td style="width:55px;color:darkred">${spaces}&nbsp;</td>
                                                                    <td style="width:55px;color:darkred">${leng/2000}&nbsp;</td>
                                                                    <td style="color:darkred">${dateDifArray[storycount2].toFixed(3)}&nbsp;</td></tr>` );
                                    NSFWcount2++;
                                } else {
                                    $("#stories2").prepend( `<tr><td style="width:30px;">${storycount2}&nbsp;</td>
                                                                    <td style="width:400px;width:400px;padding-left:15px;text-indent:-15px;"><label> [<a href="${post.data.url}" title="flair: ${post.data.link_flair_text}">${storytitle}</a>]&nbsp;</td>
                                                                    <td style="width:140px;color:blue">${date}</span>&nbsp;</td>
                                                                    <td style="width:70px;">score:${post.data.score}&nbsp;</td>
                                                                    <td style="width:55px;color:green">${leng}&nbsp;</td>
                                                                    <td style="width:55px;color:green">${spaces}&nbsp;</td>
                                                                    <td style="width:55px;color:green">${leng/2000}&nbsp;</td>
                                                                    <td style="color:purple">${dateDifArray[storycount2].toFixed(3)}&nbsp;</td></tr></label>` );
                                }
                        } else {
                                if (post.data.over_18) {
                                    $("#stories2").prepend( `<tr><td style="width:30px;">${storycount2}&nbsp;</td>
                                                                    <td style="width:400px;width:400px;padding-left:15px;text-indent:-15px;"><label> [<a style="color:sienna" href="${post.data.url}" title="flair: ${post.data.link_flair_text}">${storytitle}</a>] <emphasis style="color:red;">*NSFW*</emphasis>\n</label>&nbsp;</td>
                                                                    <td style="width:140px;color:peru">${date}&nbsp;</td>
                                                                    <td style="width:70px;color:peru">score:${post.data.score}&nbsp;</td>
                                                                    <td style="width:55px;color:peru">${leng}&nbsp;</td>
                                                                    <td style="width:55px;color:peru">${spaces}&nbsp;</td>
                                                                    <td style="width:55px;color:peru">${leng/2000}&nbsp;</td>
                                                                    <td style="color:peru">${dateDifArray[storycount2].toFixed(3)}&nbsp;</td></tr>` );
                                } else {
                                    $("#stories2").prepend( `<tr><td style="width:30px;">${storycount2}&nbsp;</td>
                                                                    <td style="width:400px;width:400px;padding-left:15px;text-indent:-15px;"><label> [<a style="color:orange" href="${post.data.url}" title="flair: ${post.data.link_flair_text}">${storytitle}</a>]&nbsp;</td>
                                                                    <td style="width:140px;color:orange">${date}</span>&nbsp;</td>
                                                                    <td style="width:70px;color:orange">score:${post.data.score}&nbsp;</td>
                                                                    <td style="width:55px;color:orange">${leng}&nbsp;</td>
                                                                    <td style="width:55px;color:orange">${spaces}&nbsp;</td>
                                                                    <td style="width:55px;color:orange">${leng/2000}&nbsp;</td>
                                                                    <td style="color:orange">${dateDifArray[storycount2].toFixed(3)}&nbsp;</td></tr></label>` );
                                    modremovedcount2++;
                                } //end if NSFW
                        }; //end if not removed

                            arrayarray[storycount2] = storycount2; //the only instance of arrayarray?
                            scorearray[storycount2] = post.data.score;
                            totscore += post.data.score;
//                            $('#avg').html(`${avgscore}`);
                            lengtharray[storycount2] = leng;
                            totleng += leng;
//                            $('#avglength').html(`${avgleng}`);
                        }
                    }
                    $('#hfycount2').html(`${hfycount2}`);
                    $('#storycount2').html(`${storycount2}`);
                    $('#metacount2').html(`${hfycount2 - storycount2}`);
                    $('#modremovedcount2').html(`${modremovedcount2}`);
                    $('#NSFWcount2').html(`${NSFWcount2}`); //update numbers of totaled things

                    avgscore = totscore/storycount2;
                    avgleng = (totleng/2000)/storycount2; //1 page is 2000 characters
                    var cl = cleanArray(dateDifArray); //removes zeroes
                    var dl = cl.reduce((a, b) => a + b, 0); //sums array values
                    $("#avgDaysBetw").html(`${(dl/storycount2).toFixed(2)}`);
                    $('#avgscore').html(`${avgscore.toFixed(2)}`);
                    $('#avglength').html(`${avgleng.toFixed(2)}`);
                    $("#totallength").html(`${(totleng/2000).toFixed(2)}`); //1 page is 2000 characters //update numbers of calculated things


                });
                if (children && children.length > 0) {
                    lastID = children[children.length - 1].data.name;
                    totalSubmissions2 += children.length;
                    $('#totalSubmissions2').html(`${totalSubmissions2}`);
                    load(lastID);
                }
            })
                .error(function() {
                if (author == "[deleted]") {
                    $("#stories2").append( `<span style="color:red">ERROR - ACCOUNT DELETED</span>`);
                } else {
                    $("#stories2").append( `<span style="color:red">ERROR ... Shadowbanned?</span>`);
                }
            }); //end error

        } //end load

        load(lastID);
        var meh = $(".expando").text().replace(/(?:\r\n|\r|\n)/g, '').length;
        $("#pages").html( `- ${meh/2000}`); //length of current page, printed on the button

        //graphing!
//        dateDifArray[1] = 0;
        var graphData;
        var layout1;
        $('#graphBtn').click(function() {
//            scorearray.shift();
//            lengtharray.shift();
//            dateDifArray.shift(); //get rid of initial 0s
            var pageArray = [0];
            for (var x = 0, l = lengtharray.length; x < l; x++) {
                pageArray[x] = lengtharray[x] / 2000;
            }

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
                name: 'length over time'
            }

            var graphDataTrace3 = {
                x: dateDifArray.length,
                y: dateDifArray,
                type: 'scatter',
                name: 'days between over time'
            }

            graphData = [graphDataTrace1, graphDataTrace2, graphDataTrace3];

            layout1 = {
                yaxis: {rangemode: 'tozero',
                        showline: true,
                        zeroline: true},
                xaxis: {autorange:'reversed'}
            };

            Plotly.newPlot('graph1', graphData, layout1);

            var scoremin = scorearray.filter(function(x){ return x> 0;}).sort(function(a,b){ return a>b; })[0];
            var lengthmin = lengtharray.filter(function(x){ return x> 0; }).sort(function(a,b){ return a>b; })[0];
            var datemin = dateDifArray.filter(function(x){ return x> 0; }).sort(function(a,b){ return a>b; })[0];

            $('#scoremax').html(Math.max( ...scorearray));
            $('#scoremin').html(scoremin);
            $('#lengthmax').html((Math.max( ...lengtharray) /2000).toFixed(2));
            $('#lengthmin').html((lengthmin/2000).toFixed(2));
            $('#daysmax').html(Math.max( ...dateDifArray).toFixed(2));
            $('#daysmin').html(datemin.toFixed(3)); //dateDifArray.filter(Boolean)
        });



        $('#setzero')[0].onclick = function() {
            dateDifArray[1] = 0;
            $('#setzero').css("background-color", "Gray")
            $('#sethigh').css("background-color", "Silver")
            Plotly.newPlot('graph1', graphData, layout1);

            $('#daysmax').html(Math.max( ...dateDifArray).toFixed(2));
        };


        $('#sethigh')[0].onclick = function() {
            dateDifArray[1] = CurrentDays;
            $('#setzero').css("background-color", "Silver")
            $('#sethigh').css("background-color", "Gray")
            Plotly.newPlot('graph1', graphData, layout1);

            $('#daysmax').html(Math.max( ...dateDifArray).toFixed(2));
        };

    }); //document ready
})();
