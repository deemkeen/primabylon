// Global-Part

var Messages = new Meteor.Collection("messages");
var Translations = new Meteor.Collection("translations");
var isTranslated = false;
var toTranslate = true;

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
        Session.set("userlang", undefined);
    });

    // Yahoo Query Language Wrapper for jQuery
    $.YQL = function(query, callback) {

        if (!query || !callback) {
            throw new Error('$.YQL(): Parameters may be undefined');
        }

        var url = "http://query.yahooapis.com/v1/public/yql?q=" + query + "&format=json&env=store://datatables.org/alltableswithkeys&callback=?";
        $.getJSON(url, callback);

    };


    // global helper: is the Session set?
    Handlebars.registerHelper('chatUser', function() {
        if (Session.get("username") && Session.get("userlang")) {
            return true;
        }
    });

    ////////////////////////////////////////////////////////////////////////////////////
    Template.line.MessageList = function() {

        isTranslated = false;

        Messages.find({}, { sort: { created: 1} }).forEach( function(message) {

            if (message.userlang != Session.get("userlang")) {

                toTranslate = true;

                for (lang in message.languages) {

                    if (message.languages[lang] == Session.get("userlang")) {

                        console.log("Übersetzung für Message vorhanden");
                        
                        toTranslate = false;
                        
                        break;

                    } 

                }

                if (toTranslate) {

                        console.log("Nachrichten in anderer Sprache und nicht verarbeitet!");

                        var yq = encodeURIComponent("select json.json.json from google.translate where q='" + addslashes(message.text) + "' and source='" + message.userlang + "' and target='" +  Session.get("userlang") + "' limit 1");

                        $.YQL(yq, function(data) {

                            var post = data.query.results.json.json.json.json;

                            if (post) {

                                isTranslated = true;

                                Translations.insert({text: post,
                                                     user: message.user,
                                                     userlang: Session.get("userlang"),
                                                     created: message.created,
                                                     time: message.time});

                                
                            } 

                        });

                }


            } 

        });
        
        return Translations.find({userlang: Session.get("userlang")}, {sort: {created: 1}});

    };

    Template.line.rendered = function() {

        if(isTranslated) {

            Messages.update({languages: { $nin: [Session.get("userlang")]} }, {$push: {languages: Session.get("userlang")}});
        }

        $('#mymessage').val('');

    };

    Template.hello.events({
        "keydown #mymessage": function(event) {

            var code = (event.keyCode ? event.keyCode : event.which);

            if (code == 13) {

                var text = $('#mymessage').val();
                var curdate = new Date();
                var curtime = timeformat(curdate);

                Messages.insert({text: text,
                                 user: Session.get("username"),
                                 userlang: Session.get("userlang"),
                                 created: curdate,
                                 time: curtime,
                                 languages: [Session.get("userlang")]
                });

                Translations.insert({text: text, 
                                     user: Session.get("username"),
                                     userlang: Session.get("userlang"),
                                     created: curdate,
                                     time: curtime
                });                

            }
        },
        "click #btn-sess" : function () {
            
            var username = $('input:text[name=username]').val();
            var userlang = $('#userlang').val();

            if (username && userlang) {

                Session.set("username", username);
                Session.set("userlang", userlang);

            }
        }
    });
}

// Server-Part

if (Meteor.isServer) {
    Meteor.startup(function() {

        Messages.remove({});
        Translations.remove({});

        //Messages._ensureIndex({created:1, userlang: 1}, {unique: true});
        //Translations._ensureIndex({created:1, userlang: 1}, {unique: true});

    });

}