// Global-Part
var Messages = new Meteor.Collection("messages");
var Translations = new Meteor.Collection("translations");
var nowTranslated = false;
var toTranslate = false;

// helper function
function addslashes(str) {
    return (str + '').replace(/([\\'])/g, "\\$1").replace(/\0/g, "\\0");
}

// helper time format (time object)
function timeformat(obj) {

    var currentHours = obj.getUTCHours();
    var currentMinutes = obj.getUTCMinutes();
    var currentSeconds = obj.getUTCSeconds();

    currentHours = (currentHours < 10 ? "0": "") + currentHours;
    currentMinutes = (currentMinutes < 10 ? "0": "") + currentMinutes;
    currentSeconds = (currentSeconds < 10 ? "0": "") + currentSeconds;

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

        // Whole Query for JSON output
        var url = "http://query.yahooapis.com/v1/public/yql?q=" + query + "&format=json&env=store://datatables.org/alltableswithkeys&callback=?";
        $.getJSON(url, callback);

    };

    // global helper: is the Session set?
    Handlebars.registerHelper('chatUser', function() {
        if (Session.get("username") && Session.get("userlang")) {
            return true;
        }
    });

    // global helper: Current User Language?
    Handlebars.registerHelper('userLang', function() {
        return Session.get("userlang");
    });

    ////////////////////////////////////////////////////////////////////////////////////
    Template.line.MessageList = function() {

        // main routine - searching messages to translate them in current user language - the code screams for optimization!
        Messages.find({}, {
            sort: {
                created: 1
            }
        }).forEach(function(message) {

            if (message.userlang != Session.get("userlang")) {

                toTranslate = true;

                for (lang in message.languages) {

                    if (message.languages[lang] == Session.get("userlang")) {

                        toTranslate = false;
                        nowTranslated = false;

                        break;

                    }

                }

                if (toTranslate) {

                    // selecting DOM elements at Google Translate, since the Google API is not free, this approach will help us out
                    var yq = encodeURIComponent("select json.json.json from google.translate where q='" + addslashes(message.text) + "' and source='" + message.userlang + "' and target='" + Session.get("userlang") + "' limit 1");

                    $.YQL(yq, function(data) {

                        var post = data.query.results.json.json.json.json;

                        if (post) {

                            nowTranslated = true;

                            Translations.insert({
                                text: post,
                                user: message.user,
                                userlang: Session.get("userlang"),
                                origin: message.userlang,
                                created: message.created,
                                time: message.time
                            });

                        }

                    });

                }

            }

        });

        // Making sure all translations were saved
        Meteor.flush();

        return Translations.find({
            userlang: Session.get("userlang")
            }, {
            sort: {
                created: 1
            }
        });

    };

    Template.line.rendered = function() {


        // Dirty code - updating global message collection while rendering the translation
        if (nowTranslated) {
            Messages.update({
                languages: {
                    $nin: [Session.get("userlang")]
                    }
            }, {
                $push: {
                    languages: Session.get("userlang")
                    }
            }, {
                multi: true
            });
        }

    };

    Template.chat.rendered = function() {

        var element = this.find("#chatbox");

        if(element.clientHeight === element.scrollHeight) {
            this.scrolledFlush = true;
        } 
        else if(this.scrolledFlush) {
            element.scrollTop = element.scrollHeight - element.clientHeight;
        }
        else if(typeof this.scrolledFlush == "undefined") { //first time rendered
            element.scrollTop = element.scrollHeight - element.clientHeight;
        } 
    };

    Template.chat.events({
        'scroll #chatbox': function(event, template) {
            var e = event.target;
            if(e.scrollTop === e.scrollHeight - e.clientHeight) {
                template.scrolledFlush = true;
            } else {
                template.scrolledFlush = false;
            }
        }
    });

    Template.hello.events({



        // Event handling the enter button
        "keydown #mymessage": function(event) {

            var code = (event.keyCode ? event.keyCode: event.which);

            if (code == 13) {

                var text = $('#mymessage').val();
                var curdate, curtime;

                $.ajax({
                    url: 'http://timeapi.org/utc/now.json', // synced time for every message
                    dataType: 'jsonp'
                })
                .done(function(response) {

                    curdate = new Date(response.dateString);
                    curtime = timeformat(curdate);

                    Messages.insert({
                        text: text,
                        user: Session.get("username"),
                        userlang: Session.get("userlang"),
                        created: curdate,
                        time: curtime,
                        languages: [Session.get("userlang")]
                        });

                    Translations.insert({
                        text: text,
                        user: Session.get("username"),
                        userlang: Session.get("userlang"),
                        origin: Session.get("userlang"),
                        created: curdate,
                        time: curtime
                    });

                });

                Meteor.flush();
                $('#mymessage').val('');

            }
        },

        // Start chatting after choosing username/language
        "click #btn-sess": function() {

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

        // Observe message count, reset system after saving more than 50 messages
        var countMsg = 0;
        var query = Messages.find({});
        var handle = query.observe({
            added: function() {
                countMsg++;
                if (countMsg > 50) {
                    Meteor.flush();
                    Messages.remove({});
                    Translations.remove({});
                    countMsg = 0;
                }
            }
        });

    });

}
