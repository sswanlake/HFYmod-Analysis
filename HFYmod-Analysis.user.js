// ==UserScript==
// @name         HFYmod-analysis
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  A tool for analysing Reddit's HFY story submissions
// @author       /u/sswanlake
// @match        *.reddit.com/r/HFY/comments/*
// @updateURL    https://github.com/sswanlake/HFYmod-Analysis/raw/master/HFYmod-Analysis.user.js
// @grant        none
// ==/UserScript==

//previously: avg score, length, and vote-to-view ratio
//what's new: days between stories, column labels

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
                    <p><span id="totalSubmissions2" style="color:red"></span> total submissions, <span id="hfycount2" style="color:red"></span> of which are in HFY</p>
                    <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Of those, <span id="storycount2" style="color:red"></span> are stories and <span id="metacount2" style="color:red"></span> are other submissions</p>
                    <p>avg score: <span id="avgscore" style="color: red">will</span> - avg length: <span id="avglength" style="color: orange">this</span> - ttl length: <span id="totallength" style="color:green">work</span> - avg V-to-V: <span id="avgratio" style="color:blue">correctly</span> - avg days b/w: <span id="avgDaysBetw" style="color:purple">now?</span><span id="boop"></span></p>
                    <hr/>
                    <p><strong style="font-size: 150%">WIKI:</strong> <a href="https://www.reddit.com/r/HFY/wiki/authors/${author}" target="_blank" style="font-size: 150%">${author}</a>  &nbsp; &nbsp; <span id="existsYN"></span>  &nbsp; &nbsp; <a onclick="$('.authorpage').toggle()">hide author</a></p>
                    <p>&nbsp;</p>
                    <div class="authorpage" id="authorpage" style="border:1px solid gray; background:Lavender; overflow-y:auto; overflow-x:auto;">
                    <table><tr><td style="width:430px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Title </td><td style="width:140px;">Date </td><td style="width:70px;">Score </td><td style="width:55px;">Pages </td><td style="width:80px;">Views </td><td style="width:60px;">V-to-V</td><td>Days Between </td></tr></table>
                    <table><span id="stories2"></span></table>
                    <p>&nbsp;</p>
                    </div>
                    <p>&nbsp;</p>
                    <div class="endOfModal">
                    </div>
                </div>
            </div>
        `);

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

        var totscore = 0;
        var avgscore = 0;
        var totleng = 0;
        var avgleng = 0;

        var scorearray = [0];
        var lengtharray = [0];
        var datearray = [0];
        var dateDifArray = [0];
        var voteviewratioarray = [0];

        function load(after) {
            $.getJSON(`https://www.reddit.com/user/${author}/submitted.json?sort=new&after=${after}`, function (foo) {
                var children = foo.data.children;
                var date;
                $.each(children, function (i, post) {
                    if (post.data.subreddit == "HFY"){
                        date = timeConvert(post.data.created_utc);
                        hfycount2++;
                        var flair = post.data.link_flair_css_class;
                        var ratio = post.data.upvote_ratio;
                        //var ratio = 0.98;
                        var leng = (post.data.selftext).replace(/(?:\r\n|\r|\n)/g, '').length;
                        if ((flair == "META") || (flair == "Text") || (flair == "Misc") || (flair == "Video") || (post.data.link_flair_text == "WP")){ //WP needs a special case because reasons. Meta used to be META. Also, there used to be a "meta mod" flair
                            $("#otherposts2").prepend( `<tr><td><label>* <a href="${post.data.url}" contenteditable="true" title="flair: ${post.data.link_flair_text},  created: ${date},  score: ${post.data.score}">` + post.data.title + `</a></td><td><span style="color:blue">${date}</span> </td></td> <td>score:${post.data.score}</td></tr>` );
                            metacount2++;
                        } else {
                            counter ++;
                            datearray[counter] = post.data.created_utc;
                            dateDifArray[counter] = Math.abs( (post.data.created_utc - (datearray[counter-1]))/ (60 * 1000) ); //is in days
                            if (dateDifArray[counter] >= 24000) {
                                dateDifArray[counter] = 0;
                            } //remove first eronious one, to make the numbers nice

                            if (post.data.over_18) {
                                $("#stories2").prepend( `<tr><td style="width:20px;">${counter}&nbsp;</td><td style="max-width:400px;;width:400px"><label> [<a href="${post.data.url}" title="flair: ${post.data.link_flair_text}">` + (post.data.title).replace(`[OC]`, '').replace(`(OC)`, '').replace(`[PI]`, '').trim() + `</a>] <emphasis style="color:red;">*NSFW*</emphasis>\n</label>&nbsp;</td><td style="color:purple">${date}&nbsp;</td><td style="color:darkred">score:${post.data.score}&nbsp;</td><td style="color:darkred">${leng/2000}&nbsp;</td><td style="color:darkred">views:${post.data.view_count}&nbsp;</td><td style="color:darkred">${(post.data.score)/(post.data.view_count)}&nbsp;</td><td style="color:darkred">${dateDifArray[counter].toFixed(3)}&nbsp;</td></tr>` );
                            } else {
                                $("#stories2").prepend( `<tr><td style="width:30px;">${counter}&nbsp;</td><td style="max-width:400px;width:400px"><label> [<a href="${post.data.url}" title="flair: ${post.data.link_flair_text}">` + (post.data.title).replace(`[OC]`, '').replace(`(OC)`, '').replace(`[PI]`, '').trim() + `</a>]&nbsp;</td><td style="color:blue">${date}</span>&nbsp;</td><td>score:${post.data.score}&nbsp;</td><td style="color:green">${leng/2000}&nbsp;</td><td>views:${post.data.view_count}&nbsp;</td><td>${((post.data.score)*100/(post.data.view_count)).toFixed(3)}%&nbsp;</td><td style="color:purple">${dateDifArray[counter].toFixed(3)}&nbsp;</td></tr></label>` );
                            }

                            scorearray[(50*counter) + i] = post.data.score;
                            if (post.data.view_count > null){
                                voteviewratioarray[(50*counter) + i] = (post.data.score)/(post.data.view_count);
                            }
                            totscore += post.data.score;
                            $('#avg').html(`${avgscore}`);
                            lengtharray[(50*counter) + i] = leng/2000;
                            totleng += (leng/2000);
                            $('#avglength').html(`${avgleng}`);
                            storycount2++;
                        }
                    }
                    $('#hfycount2').html(`${hfycount2}`);
                    $('#storycount2').html(`${storycount2}`);
                    $('#metacount2').html(`${metacount2}`); //update numbers

                    avgscore = totscore/storycount2;
                    avgleng = totleng/storycount2;
                    var al = cleanArray(voteviewratioarray); //removes empty values
                    var bl = al.reduce((a, b) => a + b, 0); //sums array values
                    $('#avgscore').html(`${avgscore.toFixed(4)}`);
                    $('#avglength').html(`${avgleng.toFixed(4)}`);
                    $("#totallength").html(`${totleng.toFixed(4)}`);
                    $("#avgratio").html(`${((bl/al.length)*100).toFixed(3)}%`); //update average numbers

                    var cl = cleanArray(dateDifArray);
                    var dl = cl.reduce((a, b) => a + b, 0); //sums array values
                    $("#avgDaysBetw").html(`${dl/storycount2}`);

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

        //graph: post#-time post#-score post#-pagecount score-pagecount

    }); //document ready

})();
