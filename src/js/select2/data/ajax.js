define([
  './array',
  '../utils',
  'jquery'
], function (ArrayAdapter, Utils, $) {
  function AjaxAdapter ($element, options) {
    this.ajaxOptions = this._applyDefaults(options.get('ajax'));
//ajaxoption继承了其他对象。并拥有自己的属性
    if (this.ajaxOptions.processResults != null) {
      this.processResults = this.ajaxOptions.processResults;
    }

    AjaxAdapter.__super__.constructor.call(this, $element, options);
  }

  Utils.Extend(AjaxAdapter, ArrayAdapter);


  AjaxAdapter.prototype._applyDefaults = function (options) {
  //定义了一个对象。包括两个参数。data参数是一个函数。将传进来的参数 包装成新的对象的一个函数。这个新对象不仅有传进来的参数的属性。还有新的属性
    //q。是通过字面量声明的一个对象来添加的。也就是说一个对象拥有一些属性。可以是点运算符添加。也可以是通过extend函数。
    var defaults = {
      data: function (params) {
        return $.extend({}, params, {
          q: params.term
        });
      },
      //这个函数是发送一个ajax请求。三个参数，一个是ajax请求中所需的参数。还有就是两个函数。可是为什么他们不同时包装在一个参数中。这个就是接口的设计吧。
      //也就是传入数据的格式。当然如果你传入的数据格式并不是我想要的。我可以通过函数来改变格式。这个就是适配器。适配就是改变格式吧。
      transport: function (params, success, failure) {
        var $request = $.ajax(params);

        $request.then(success);
        $request.fail(failure);

        return $request;
      }
    };

    return $.extend({}, defaults, options, true);
  };

  AjaxAdapter.prototype.processResults = function (results) {
    return results;
  };

//这个函数根据ajaxadapter特用的参数进一步修正。这个进一步修正是根据函数传入的参数来的。
  //所以说不要写重复的代码。重复的部分提取成一份。不重复的部分，一个根据用户定义来添加。还有一个就是在不动的基础上根据需要进行添加，不由用户定义。
  AjaxAdapter.prototype.query = function (params, callback) {
    var matches = [];
    var self = this;

    if (this._request != null) {
      // JSONP requests cannot always be aborted
      if ($.isFunction(this._request.abort)) {
        this._request.abort();
      }

      this._request = null;
    }

    var options = $.extend({
      type: 'GET'
    }, this.ajaxOptions);

    if (typeof options.url === 'function') {
      options.url = options.url.call(this.$element, params);
    }

    if (typeof options.data === 'function') {
      options.data = options.data.call(this.$element, params);
    }
//处理了函数后，定义了request 的函数。这个函数随后被调用，一个是立即调用，一个是settimetout调用。实际上这个函数在内部调用了上面参数中保存的transprot函数。注意这里
    //失败的话。出发的也是“result：message”事件
    function request () {
      var $request = options.transport(options, function (data) {
        var results = self.processResults(data, params);

        if (self.options.get('debug') && window.console && console.error) {
          // Check to make sure that the response included a `results` key.
          if (!results || !results.results || !$.isArray(results.results)) {
            console.error(
              'Select2: The AJAX results did not return an array in the ' +
              '`results` key of the response.'
            );
          }
        }

        callback(results);
      }, function () {
        // Attempt to detect if a request was aborted
        // Only works if the transport exposes a status property
        if ($request.status && $request.status === '0') {
          return;
        }

        self.trigger('results:message', {
          message: 'errorLoading'
        });
      });

      self._request = $request;
    }

    if (this.ajaxOptions.delay && params.term != null) {
      if (this._queryTimeout) {
        window.clearTimeout(this._queryTimeout);
      }

      this._queryTimeout = window.setTimeout(request, this.ajaxOptions.delay);
    } else {
      request();
    }
  };

  return AjaxAdapter;
});
