var Messages = new Meteor.Collection("messages");

if (Meteor.isClient) {

    // Yahoo Query Language Wrapper for jQuery
    $.YQL = function(query, callback) {

        if (!query || !callback) {
            throw new Error('$.YQL(): Parameters may be undefined');
        }

        var url = "http://query.yahooapis.com/v1/public/yql?q=" + query + "&format=json&env=store://datatables.org/alltableswithkeys&callback=?";
        $.getJSON(url, callback);

    };

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

    // global helper: Works for all Templates!
    Handlebars.registerHelper('anyMessages', function() {
        return Messages.find().count() > 0;
    });

    ////////////////////////////////////////////////////////////////////////////////////
    Template.line.MessageList = function() {
        return Messages.find({}, {
            sort: {
                created: 1
            }
        });
    };

    Template.line.rendered = function() {
        $('#mymessage').val('');
    };

    Template.hello.events({
        "keydown #mymessage": function(event) {

            var code = (event.keyCode ? event.keyCode : event.which);

            if (code == 13) {

                var text = $('#mymessage').val();
                var sl = $('input:text[name=sl]').val();
                var tl = $('input:text[name=tl]').val();

                if (text == '#remove') { // Debug
                    $('#mymessage').val('');
                    return Messages.remove({});
                }

                var yq = encodeURIComponent("select json.json.json from google.translate where q='" + addslashes(text) + "' and source='" + sl + "' and target='" + tl + "' limit 1");

                $.YQL(yq, function(data) {

                    var post = data.query.results.json.json.json.json;

                    if (post) {

                        var curdate = new Date();
                        var curtime = timeformat(curdate);

                        Messages.insert({
                            text: post,
                            created: curdate,
                            time: curtime
                        });

                    }

                });
            }
        }
    });

}

if (Meteor.isServer) {
    Meteor.startup(function() {

        Messages.remove({});

    });
}