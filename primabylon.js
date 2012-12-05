// Global-Part

var Messages = new Meteor.Collection("messages");


// helper function

function addslashes(str) {
    return (str + '').replace(/([\\'])/g, "\\$1").replace(/\0/g, "\\0");
}

// helper time format (time object)

function timeformat(obj) {

    var currentHours = obj.getHours();
    var currentMinutes = obj.getMinutes();
    var currentSeconds = obj.getSeconds();

    currentHours = (currentHours < 10 ? "0" : "") + currentHours;
    currentMinutes = (currentMinutes < 10 ? "0" : "") + currentMinutes;
    currentSeconds = (currentSeconds < 10 ? "0" : "") + currentSeconds;

    return time = currentHours + ":" + currentMinutes + ":" + currentSeconds;

}

// Client-Part

if (Meteor.isClient) {

    Meteor.startup(function() {
        Session.set("username", undefined);
        Session.set("sl", undefined);
    });

    // Yahoo Query Language Wrapper for jQuery
    $.YQL = function(query, callback) {

        if (!query || !callback) {
            throw new Error('$.YQL(): Parameters may be undefined');
        }

        var url = "http://query.yahooapis.com/v1/public/yql?q=" + query + "&format=json&env=store://datatables.org/alltableswithkeys&callback=?";
        $.getJSON(url, callback);

    };

    // global helper: Works for all Templates!
    Handlebars.registerHelper('anyMessages', function() {
        return Messages.find().count() > 0;
    });

    // global helper: is the Session set?
    Handlebars.registerHelper('chatUser', function() {
        if (Session.get("username") && Session.get("sl")) {
            return true;
        }
    });

    ////////////////////////////////////////////////////////////////////////////////////
    Template.line.MessageList = function() {

        var userlang = Session.get("sl");
        var MessageList = [];

        MessageList = Messages.find({}, { sort: { created: 1} }).fetch();

        MessageList.forEach( function(message) {
            if (message.userlang !== userlang) {
                
                if (message.transtext.userlang) {
                    message.text = message.transtext.userlang;
                }
                else {

                    var yq = encodeURIComponent("select json.json.json from google.translate where q='" + addslashes(text) + "' and source='" + message.userlang + "' and target='" + userlang + "' limit 1");

                    $.YQL(yq, function(data) {

                        var post = data.query.results.json.json.json.json;

                        if (post) {

                            var curdate = new Date();
                            var curtime = timeformat(curdate);

                            Messages.insert(
                            { _id: message._id},
                            {
                                $set: {
                                    transtext: [ {userlang : post}]
                                }
                            });

                        }

                    });

                }

            }

            //console.log("Message Lang: " + message.userlang + " User Lang " + userlang);
        });


        return MessageList;
    };

    Template.line.rendered = function() {
        $('#mymessage').val('');
    };

    Template.hello.events({
        "keydown #mymessage": function(event) {

            var code = (event.keyCode ? event.keyCode : event.which);

            if (code == 13) {

                var text = $('#mymessage').val();

                var sl = $('#sl').val();
                var tl = "en";

                if (text == '#remove') { // Debug
                    $('#mymessage').val('');
                    return Messages.remove({});
                }

                var yq = encodeURIComponent("select json.json.json from google.translate where q='" + addslashes(text) + "' and source='" + Session.get("sl") + "' and target='" + tl + "' limit 1");

                $.YQL(yq, function(data) {

                    var post = data.query.results.json.json.json.json;

                    if (post) {

                        var curdate = new Date();
                        var curtime = timeformat(curdate);

                        Messages.insert({
                            text: post,
                            user: Session.get("username"),
                            userlang: Session.get("sl"),
                            created: curdate,
                            time: curtime
                        });

                    }

                });
            }
        },

        "click #btn-sess" : function () {
            
            var username = $('input:text[name=username]').val();
            var sl = $('#sl').val();

            if (username && sl) {
                Session.set("username", username);
                Session.set("sl", sl);
            }
        }


    });

}

// Server-Part

if (Meteor.isServer) {
    Meteor.startup(function() {

        Messages.remove({});

    });
}