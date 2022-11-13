import {loadMap, setCamDestination} from "./map.js";

const tinderSvg1 = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 123 123\"><path fill=\"url(#"
const tinderSvg2 = ")\" d=\"M31.5 49.6C55 41.5 59 20.4 56 1c0-.7.6-1.2 1.2-1C79.7 11 105 35 105 71c0 27.6-21.4 52-52.5 52a50 50 0 0 1-28.2-92.7c.6-.4 1.4 0 1.4.7.3 3.7 1.3 13 5.4 18.6h.4z\"/></svg>"

function addHighlights(cal){

}

function generateTag(user){
    let streakNum = 0;
    let streakColor = "";
    let postedToday = user.imagePosted[user.imagePosted.length-1];
    if (postedToday){
        streakColor = "green";
        for(let i = user.imagePosted.length-1; i>=0; i--){
            if(!user.imagePosted[i])
                break;
            streakNum++;
        }
    } else {
        if(user.imagePosted.length==1){
            streakColor = "yellow";
            streakNum = 0;
        } else if(user.imagePosted[user.imagePosted.length-2]) {
            //On a streak of at least one but need to post today to continue it
            streakColor = "yellow";
            for(let i = user.imagePosted.length-2; i>=0; i--){
                if(!user.imagePosted[i])
                    break;
                streakNum++;
            }
        } else {
            //on a negative streak
            streakColor = "red";
            for(let i = user.imagePosted.length-2; i>=0; i--){
                if(user.imagePosted[i])
                    break;
                streakNum--;
            }
        }
    }

    return "<div class='profile-card' data-user="+user.name+">" +
        "<img class='pfp' src='api/images/"+user.pfp+"'>" +
        "<div class='info'>" +
        "<p class='name'>"+user.name+"</p>" +
        "<div class='streak "+streakColor+"'>"+tinderSvg1+streakColor[0]+tinderSvg2+"<p class='streak-num'>" +streakNum+"</p></div>" +
        "</div>"+
        "</div>";
}
var highlights = [];
$(function(){

    $.getJSON('/api/users.json', function(data) {
        // JSON result in `data` variable
        let loggedIn = false;
        for(let userIndex in data){
            let user = data[userIndex];

            let postedToday = user.imagePosted[user.imagePosted.length-1];

            if(user.name === username){
                loggedIn = true;
                const now = new Date();
                for(let i= -6; i<0; i++){
                    let then = new Date(now.getTime()+i*(1000 * 3600 * 24));
                    let gotIt = false;
                    if(user.imagePosted.length-1+i>=0)
                        gotIt = user.imagePosted[user.imagePosted.length - 1 + i];
                    if(gotIt) {
                        $(".calendar").append("<span class='day' id='cal-"+(6+i)+"'>" + then.getDate() + "</span>");
                        highlights.push(true);
                    }
                    else {
                        $(".calendar").append("<span class='day missed' id='cal-" + (6 + i) + "'>" + then.getDate() + "</span>");
                        highlights.push(false)
                    }
                }
                $(".calendar").append("<span class='day last-container' id='cal-"+6+"'><div class='last-num'>" + now.getDate() + "</div></span>");
                $(".cam-container").appendTo(".last-container");
                if(postedToday) {
                    $(".cam-container").css("display","none");
                    highlights.push(true);
                }else{
                    $(".last-num").css("font-size","0");
                    highlights.push(false);
                }
                let i=0;
                while(i<highlights.length){
                    let d = 0;
                    while (highlights[i+d])
                        d++;
                    if(d>0){
                        let w = 2 + 3*(d-1);
                            $("#cal-"+i).prepend("<div class='highlight'>");
                        setTimeout(function (a){
                            //$("#cal-"+a+" .highlight").css("display","block")
                            $("#cal-"+a+" .highlight").css("width",""+w+"rem")
                            $("#cal-"+a+" .highlight").css("border-color","black")
                        },500+150*i,i)
                        i+=d;
                    } else
                        i++
                }

                let userProfile = generateTag(user);
                $(".top-left").append(userProfile);
                continue;
            }

            $(".bottom-bar").append(generateTag(user));
        }
        if(!loggedIn){
            window.location.href = "/login";
        }

        $(".profile-card").click(function (){
            let username = $(this).attr("data-user");
            setCamDestination(username);
        });

        loadMap(username, data)
    });
    $.getJSON("/api/challenges.json", function (data) {
        const startDate = new Date(data.startDate.y,data.startDate.m-1,data.startDate.d);
        const now = new Date();
        let timeDiff = now.getTime() - startDate.getTime();
        let dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        $("#chal-txt").append(data.challenges[dayDiff]);
        setTimeout(function() {
            $(".chal-container").css("height","5rem");
        },3000);
    });
});

$(".cam-container").click(async function (){
    $("#cameraPopup").css("display","block");
    let stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    let {width, height} = stream.getTracks()[0].getSettings();
    console.log(width, height)
    video.srcObject = stream;
    video.setAttribute("width",width);
    video.setAttribute("height",height);
    canvas.setAttribute("width",width);
    canvas.setAttribute("height",height);
});
let video = document.querySelector("#video");
let click_button = document.querySelector("#click-photo");
let canvas = document.querySelector("#canvas");

click_button.addEventListener('click', function() {
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    let hidden = $('.hidden');
    let shown = $('.shown');
    hidden.addClass('shown').removeClass('hidden');
    shown.addClass('hidden').removeClass('shown');
});

$("#upload-photo").click(function (){
    let image_data_url = canvas.toDataURL('image/jpeg').replace(/^data:image\/jpeg;base64,/, "");
    console.log("sending request: "+"/api/post/photo/user/"+username)
    $(".cam-svg").css("height","0");
    setTimeout(function(){
        $(".cam-container").css("display","none");
    }, 1000);
    $(".last-num").css("font-size","inherit");
    if(highlights[5]){
        let i = 5;
        while(i>0 && highlights[i-1])
            i--;
        setTimeout(function () {
            $("#cal-"+i+" .highlight").css("width",""+(2+(3*(6-i)))+"rem");
        },2000);
    } else {
        $("#cal-6").prepend("<div class='highlight'>");
        setTimeout(function () {
            $("#cal-6 .highlight").css("width",""+2+"rem");
            $("#cal-6 .highlight").css("border-color","black");
        },2000);
    }
    $("#cameraPopup").css("display","none");
    video.srcObject = null;
    navigator.geolocation.getCurrentPosition(function(pos) {
        $.post("/api/post/photo/user/" + username,
            {"location": [pos.coords.latitude, pos.coords.longitude], "img": image_data_url});
    });
});
$("#retake-photo").click(function (){
    let hidden = $('.hidden');
    let shown = $('.shown');
    hidden.addClass('shown').removeClass('hidden');
    shown.addClass('hidden').removeClass('shown');
});
$("#closeCam").click(async function (){
    $("#cameraPopup").css("display","none");
    video.srcObject = null;
});