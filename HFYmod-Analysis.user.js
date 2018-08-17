// ==UserScript==
// @name         HFYmod-analysis
// @namespace    http://tampermonkey.net/
// @version      0.1.0.4
// @description  A tool for analysing Reddit's HFY story submissions
// @author       /u/sswanlake
// @match        *.reddit.com/r/HFY/comments/*
// @updateURL    https://github.com/sswanlake/HFYmod-Analysis/raw/master/HFYmod-Analysis.user.js
// @grant        none
// @require      https://cdn.plot.ly/plotly-latest.min.js
// ==/UserScript==

//previously: cleaned up flair section, GRAPHS!!!
//what's new: fixed Days Between results, indent title, numbers on graph match story number w/o being backwards

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

    jQuery.fn.tablenumbers = function () {
        blep
    }; //css add numbers to table rows

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
        <b><table><tr><td style="width:30px;">&nbsp;# </td><td style="width:400px;">Title </td><td style="width:140px;">Date </td><td style="width:70px;">Score </td><td style="width:55px;">Pages </td><td style="width:80px;">Views </td><td style="width:60px;">V-to-V</td><td>Days Between </td></tr></table></b>
        <div class="authorpage" id="authorpage" style="border:1px solid gray; background:Lavender; height:250px; overflow-y:auto; overflow-x:auto;">
        <table class="boop"><span id="stories2"></span></table>
        <p>&nbsp;</p>
        </div>
        <p>&nbsp;</p>
        <div id="modalGraph">
            <button id="graphBtn"> MAKE GRAPH </button>
                <div id="graph1">
                </div>
        </div>
        <div class="endOfModal">
        </div>
    </div>
</div>
`); //td style="border: solid 1px gray;"

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
        var arrayarray = [0];

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
                        var ratio = post.data.upvote_ratio;
                        var leng = (post.data.selftext).replace(/(?:\r\n|\r|\n)/g, '').length;
                        storytitle = (post.data.title).replace(`[OC]`, '').replace(`(OC)`, '').replace(`[PI]`, '').trim()
                        if ((post.data.link_flair_css_class == "OC") || (post.data.link_flair_text == "PI") || (post.data.link_flair_css_class == null)){ //WP is the class of current PI, but... that's messy
                            storycount2++;
                            datearray[storycount2] = post.data.created_utc;
                            dateDifArray[storycount2] = Math.abs( (post.data.created_utc - (datearray[storycount2-1]))/ (60 * 60 * 24) ); //is in days // * 1000
                            if (dateDifArray[storycount2] >= 10000) {
                                dateDifArray[storycount2] = 0;
                            } //remove first eronious one, to make the numbers nice

                            if (post.data.over_18) {
                                $("#stories2").prepend( `<tr><td style="width:30px;">${storycount2}&nbsp;</td>
                                                                <td style="max-width:400px;width:400px;padding-left:15px;text-indent:-15px;"><label> [<a href="${post.data.url}" title="flair: ${post.data.link_flair_text}">${storytitle}</a>] <emphasis style="color:red;">*NSFW*</emphasis>\n</label>&nbsp;</td>
                                                                <td style="color:purple">${date}&nbsp;</td>
                                                                <td style="color:darkred">score:${post.data.score}&nbsp;</td>
                                                                <td style="color:darkred">${leng/2000}&nbsp;</td>
                                                                <td style="color:darkred">views:${post.data.view_count}&nbsp;</td>
                                                                <td style="color:darkred">${((post.data.score)*100/(post.data.view_count)).toFixed(3)}%&nbsp;</td>
                                                                <td style="color:darkred">${dateDifArray[storycount2].toFixed(3)}&nbsp;</td></tr>` );
                            } else {
                                $("#stories2").prepend( `<tr><td style="width:30px;">${storycount2}&nbsp;</td>
                                                                <td style="max-width:400px;width:400px;padding-left:15px;text-indent:-15px;"><label> [<a href="${post.data.url}" title="flair: ${post.data.link_flair_text}">${storytitle}</a>]&nbsp;</td>
                                                                <td style="color:blue">${date}</span>&nbsp;</td>
                                                                <td>score:${post.data.score}&nbsp;</td>
                                                                <td style="color:green">${leng/2000}&nbsp;</td>
                                                                <td>views:${post.data.view_count}&nbsp;</td>
                                                                <td>${((post.data.score)*100/(post.data.view_count)).toFixed(3)}%&nbsp;</td>
                                                                <td style="color:purple">${dateDifArray[storycount2].toFixed(3)}&nbsp;</td></tr></label>` );
                            }

                            arrayarray[storycount2] = storycount2;
                            scorearray[storycount2] = post.data.score;
                            if (post.data.view_count > null){
                                voteviewratioarray[storycount2] = (post.data.score)/(post.data.view_count);
                            }
                            totscore += post.data.score;
                            $('#avg').html(`${avgscore}`);
                            lengtharray[storycount2] = leng/2000;
                            totleng += (leng/2000);
                            $('#avglength').html(`${avgleng}`);
                        }
                    }
                    $('#hfycount2').html(`${hfycount2}`);
                    $('#storycount2').html(`${storycount2}`);
                    $('#metacount2').html(`${hfycount2 - storycount2}`); //update numbers

                    avgscore = totscore/storycount2;
                    avgleng = totleng/storycount2;
                    var al = cleanArray(voteviewratioarray); //removes empty values
                    var bl = al.reduce((a, b) => a + b, 0); //sums array values
                    $('#avgscore').html(`${avgscore.toFixed(4)}`);
                    $('#avglength').html(`${avgleng.toFixed(4)}`);
                    $("#totallength").html(`${totleng.toFixed(4)}`);
                    $("#avgratio").html(`${((bl/al.length)*100).toFixed(3)}% <span style="color:gray">(${al.length})</span>`); //update average numbers

                    var cl = cleanArray(dateDifArray);
                    var dl = cl.reduce((a, b) => a + b, 0); //sums array values
                    $("#avgDaysBetw").html(`${(dl/storycount2).toFixed(2)}`);

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
        $('#graphBtn').click(function() {
//            scorearray.shift();
//            lengtharray.shift();
//            dateDifArray.shift(); //get rid of initial 0s

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
                y: lengtharray,
                type: 'scatter',
                name: 'length over time'
            }

            var graphDataTrace3 = {
                x: dateDifArray.length,
                y: dateDifArray,
                type: 'scatter',
                name: 'days between over time'
            }

            var graphData = [graphDataTrace1, graphDataTrace2, graphDataTrace3];

            var layout1 = {
                yaxis: {rangemode: 'tozero',
                        showline: true,
                        zeroline: true},
                xaxis: {autorange:'reversed'}
            };

            Plotly.newPlot('graph1', graphData, layout1);
        });
    }); //document ready
})();
