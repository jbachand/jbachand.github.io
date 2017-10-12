'use strict';

angular.module('angular-basemodel', [])

.factory('$baseModel', function ($rootScope, $http, $log) {
      return function(id){

        /*
        *
        * Init params for BaseModel
        *
        */

        var that = this;
        this.id = id;
        this.url= '';
        this.route = '';
        this.originalroute = '';
        this.getParams = '';
        this.hideLoader = false;
        this.data= {};
        this.pageId = null;
        this.aliases = [];
        this.apiVersionNumber = 1;
        this.headers = angular.copy($http.defaults.headers.common);
        this.headers['Content-type'] = 'application/json';

        /*
        *
        * Callbacks by broadcast
        *
        */

        this.success = function(callback) {
          $rootScope.$on(this.route+'DATA_SUCCESS', function(event, data){
            callback(data);
          });
        }

        this.error = function(callback) {
          $rootScope.$on(this.route+'DATA_ERROR', function(event, data){
            callback(data);
          });
        }

        /*
        *
        * API V1
        *
        */

        this.get = function(url, options, headers) {
            if(!url) url = this.fullUrl();
            headers = _.extend(this.headers, headers);

            if(!options) options = {};
            options.headers = headers;
            options.ignoreLoadingBar = that.hideLoader;
            return $http.get(url,options)
              .success(function(data){
                that.data = that.smartNormalizeData(data);
                $rootScope.$broadcast(that.route+'DATA_SUCCESS', that.data);
              })
              .error(function(){
                $rootScope.$broadcast(that.route+'DATA_ERROR', that.data);
                $log.error('There was an error!');
              });
        }

        this.getById = function(id) {
            if(id && !this.id){
              this.id = id;
            }
            return $http.get(this.fullUrl(id),
            {
              headers: this.headers,
              ignoreLoadingBar: that.hideLoader
            })
              .success(function(data){
                if(that.route && data[that.route.slice(0,-1)]){
                  that.data = data[that.route.slice(0,-1)];
                } else if(that.route && data[that.route]){
                  that.data = data[that.route];
                } else {
                  that.data = data;
                }
              })
              .error(function(){
                $log.error('There was an error!');
              });
        }


        this.post = function(data, makeString){
          if(!this.originalroute) {
            this.originalroute = this.route;
          }
          var postingData = {};
          if(!_.isUndefined(data)){
            this.data = data;
          }
          postingData = this.data;
          if(makeString){
            JSON.stringify(postingData);
          }
          return $http.post(this.url+this.originalroute, postingData,
            {
              headers: this.headers,
              ignoreLoadingBar: that.hideLoader
            })
            .success(function(data){
              if(that.route && data[that.route.slice(0,-1)]){
                that.data = data[that.route.slice(0,-1)];
              } else if(that.route && data[that.route]){
                that.data = data[that.route];
              } else {
                that.data = data;
              }
            })
            .error(function(){
              $log.error('There was an error!');
            });
        }

        this.put = function(data, route){
          if(!_.isUndefined(data)){
            this.data = data;
          }
          var updateRoute = this.route;
          if(!_.isUndefined(route)){
            updateRoute = route;
          }
          return $http.put(this.url + updateRoute, this.data,
            {
              headers: this.headers,
              ignoreLoadingBar: that.hideLoader
            })
            .success(function(data){
              that.apiVersion(1);
              if(that.route && data[that.route.slice(0,-1)]){
                that.data = data[that.route.slice(0,-1)];
              } else if(that.route && data[that.route]){
                that.data = data[that.route];
              } else {
                that.data = data;
              }
            })
            .error(function(){
              $log.error('There was an error!');
            });
        }

        this.delete = function(data) {
          if(!this.originalroute) {
            this.originalroute = this.route;
          }
          if(!_.isUndefined(data)){
            this.data = data;
          }
          return $http.delete(this.fullUrl(), this.data,
            {
              headers: this.headers,
              ignoreLoadingBar: that.hideLoader
            })
            .success(function(data){
              if(that.route && data[that.route.slice(0,-1)]){
                that.data = data[that.route.slice(0,-1)];
              } else if(that.route && data[that.route]){
                that.data = data[that.route];
              } else {
                that.data = data;
              }
            })
            .error(function(err){
              $log.error('There was an error!');
            });
        }


        /*
        *
        * Helpers
        *
        */


        this.smartNormalizeData = function(data){
          var normalizedData = null;
          //recursively find a top level object with an id
          if(_.isArray(data) && data.length>1){
            normalizedData = data;
          } else if(_.isArray(data) && data.length==1){
            if(_.isArray(data[0])) {
              this.smartNormalizeData(data[0]);
            } else {
              normalizedData = data[0];
            }
          } else if(_.isObject(data)){
            angular.forEach(this.aliasesIntegrity(), function(alias){
              if(_.isObject(data[alias]) && data[alias].id){
                normalizedData = data[alias];
              } else if(_.isObject(data[alias])){
                that.smartNormalizeData(data[alias]);
              }
            });
            normalizedData = data;
          }else{
            normalizedData = data;
          }
          return normalizedData;
        }

        this.aliasesIntegrity = function(){
          var tmpAliases = this.aliases;

          if(!_.isArray(this.aliases) && this.aliases){
            tmpAliases[0] = this.aliases;
          }

          if(this.route){
            tmpAliases.push(this.route.slice(0,-1));
            tmpAliases.push(this.route);
          }
          tmpAliases.push('data');
          return tmpAliases
        }

        this.setRoute = function (route, callback){
          this.route = route;
          if(callback){
            callback();
          }
        }

        this.nextPage = function(){
          if(!this.pageId) {
            this.pageId = 2;
          } else {
            this.pageId++;
          }
          return this.get();
        }

        this.previousPage = function(){
          if(!this.pageId) {
            this.pageId = 2;
          } else {
            this.pageId++;
          }
          return this.get();
        }

        this.page = function(pageId){
          if(!pageId){
            return;
          }
          this.pageId = pageId;
          return this.get();
        }

        this.toString= function() {
          return ' object id '+ this.data.id;
        }

        this.toObject = function(){
          return this.data;
        }

        this.set = function(key, value) {
          this.data[key] = value;
          return this.data;
        }

        this.apiVersion = function(version){
          this.apiVersionNumber = version;
          if(version!=1){
            this.headers.Accept = 'application/x.api.v'+version+'+json';
          } else {
            delete this.headers.Accept;
          }
        }

        this.fullUrl = function(id) {
          var url = this.url+this.route;
          if(id) url += "/"+id;
          if(this.getParams || this.pageId) url += "?";
          if(this.getParams) url += this.getParams;
          if(this.getParams && this.pageId) url += "&";
          if(this.pageId) url += "page="+this.pageId;
          return url;
        }

      }
  });
