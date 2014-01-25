function _s(s){
	return s?s:"";
}
var AppHandler = function(obj){
	this.container = obj;
	this.init();
}
AppHandler.prototype = {
	init:function(){
		$(document).ready(function(){
			$.ajaxPrefilter(function (options){options.global = true;});
			$(this).ajaxStart(function(){
				$("#notice-board").show().html("正在载入...");
			}).ajaxStop(function(){
				$("#notice-board").hide().html("请求已完成");
			}).ajaxError(function(){
				$("#notice-board").hide().html("请求失败");
			});

		});
		var handler = this;
		this.container.onclick = function(evt){
			evt = evt ? evt: window.event;
            var obj = evt.srcElement ? evt.srcElement:evt.target;
            var role = obj.getAttribute("role");
            if(!role)
            	return false;
            switch(role){
            	//点击创建按钮
            	case "add-product":{
            		var form = null;
            		while(!form){
            			if (obj.tagName.toLowerCase() == "form") {
            				form = obj;
            				break;
            			};
            			if (obj.parentNode) {
            				obj = obj.parentNode;
            			}else{
            				break;
            			}
            		}
            		return form?handler.addProduct(form):false;
            		break;
            	}
            	case "add-build":{
            		var form = null;
            		while(!form){
            			if (obj.tagName.toLowerCase() == "form") {
            				form = obj;
            				break;
            			};
            			if (obj.parentNode) {
            				obj = obj.parentNode;
            			}else{
            				break;
            			}
            		}
            		return form?handler.addBuild(form):false;
            		break;
            	}
            	//点击标题 查看详情
            	case "view-detail":{
            		return handler.viewDetail($pid);
            		break;
            	}
            	//点击更新
            	case "update":{
            		return handler.update($pid);
            		break;
            	}
            	//点击Builds
            	case "view-builds":{
            		var data = obj.getAttribute("data").json();
            		return handler.viewBuilds(data);
            		break;
            	}
            };
		}
	},
	showNotice:function(msg){
		console.log(msg);
		setTimeout(function(){$("#notice-board").show().fadeIn(3000).html(msg);},1);
	},
	showProducts:function(){
		var handler = this;
		$.getJSON("/app/query/product/view/", function(data){
			var status = new Status(data);
			if(status.isSuccess()){
				handler.parse(status.data);
			}
		});
	},
	toggleAddForm:function(){
		$(this.container).find(".row-input[role=add]").toggle();
	},
	parse:function(data){

		this.container.innerHTML = data;
	},
	addProduct:function(form){
		var pass = Validator.getInstance().checkForm(form);
		var handler = this;
		if (pass) {
			$(form).ajaxForm({"dataType":"json"}).ajaxSubmit(function(data){
				if(typeof(data)=="string"){
					data = data.json();
				}
				var status = new Status(data);
				if(!status.isSuccess()){
					handler.showNotice(status.msg);
				}
				console.log(data);
				return false;
			});
		};
		return false;
	},

	addBuild:function(form){
		var pass = Validator.getInstance().checkForm(form);
		var handler = this;
		if (pass) {
			$(form).ajaxForm({"dataType":"json"}).ajaxSubmit(function(data){
				if(typeof(data)=="string"){
					data = data.json();
				}
				var status = new Status(data);
				if(!status.isSuccess()){
					handler.showNotice(status.msg);
				}else{
					handler.queryBuilds(status.data.appid);
				}
				console.log(data);
				return false;
			});
		};
		return false;
	},
	viewDetail:function(){

	},
	update:function(){

	},
	queryBuilds:function(pid){
		var handler = this;
		$.getJSON("/app/query/builds/view/",{"id":pid}, function(data){
			var status = new Status(data);
			if(status.isSuccess()){
				handler.parse(status.data);
			}
		});
	},
	viewBuilds:function(product){
		var buildDiv = document.createElement("div");
		var app = new AppHandler(buildDiv);
		this.container.nav.push(buildDiv);
		buildDiv.setTitle("App Builds For [<strong>"+product.name+"</strong>]  package:[<strong>"+product.package+"</strong>]");
		app.queryBuilds(product.id);
	}
}
var Status = function(json){
	this.json = json;
	this.status = -1;
	this.msg = "请求失败";
	this.data = null;
	if (json && typeof(json)=="object") {
		this.msg = json["msg"];
		this.status = json["status"];
		this.data = json["data"];
	};
}
Status.prototype = {
	isSuccess:function(){
		return parseInt(this.status)==1;
	}
}

//lib
var NavigationHandler = function(container_id){
	this.container = document.getElementById(container_id);
	this.objects = [];
}
NavigationHandler.prototype = {
	addPushView:function(obj){

	},
	push:function(obj){
		var w = $(this.container).width();
		var h = $(this.container).height();
		var pushView = new NavigationPushView(this,obj);
		pushView.container.style.width = w+"px";
		if (this.objects.length>0) {
			this.objects[this.objects.length-1].container.style.display="none";
		};
		this.objects.push( pushView );
		this.container.appendChild(pushView.container);
	},
	pop:function(){
		var lastObj = this.objects[this.objects.length-1];
		lastObj.container.parentNode.removeChild(lastObj.container);
		this.objects.length --;
		lastObj = this.objects[this.objects.length-1];
		lastObj.container.style.display="";
	}
}


var NavigationPushView = function(nav, obj, width, height){
	this.nav = nav;
	this.obj = obj;
	this.container = document.createElement("div");
	this.container.className = "nh-push-view";
	this.titleContainer = null;
	this.contentContainer = null;
	this.init();
}
NavigationPushView.prototype = {
	init:function(){
		var handler = this;
		var top = document.createElement("div");
		top.className = "nh-top";

		var backBtn = document.createElement("div");
		backBtn.className = "nh-back";
		backBtn.innerHTML = " <返回 ";
		backBtn.onclick = function(){
			handler.nav.pop();
		};

		var titleContainer = document.createElement("div");
		titleContainer.className = "nh-title";

		var rightItem = document.createElement("div");
		rightItem.className = "nh-title-item-right";
		if (this.nav.objects.length>0) {
			top.appendChild(backBtn);
		};
		top.appendChild(rightItem);
		top.appendChild(titleContainer);

		this.titleContainer = titleContainer;
		this.rightItem = rightItem;

		var content = document.createElement("div");
		content.className = "nh-content";

		content.appendChild(this.obj);
		this.container.appendChild(top);
		this.container.appendChild(content);
		this.obj.setTitle = function(title){
			handler.setTitle(title);
		};
		this.obj.setRightItem = function(obj){
			handler.setRightItem(obj);
		};
		this.obj.push = function(obj){
			this.nav.push(obj);
		};
		this.obj.nav = this.nav;

	},
	setTitle:function(title){
		this.titleContainer.innerHTML = title;
	},
	setRightItem:function(obj){
		this.rightItem.appendChild(obj);
	}
};

var Validator = function(){

};
Validator.getInstance = function(){
		return new Validator();
}
Validator.prototype = {
	checkForm:function(form){
		$("input").each(function(i){

		});
		return true;
	}
};
String.prototype.json = function(){
	var json = null;
	try{
		json = eval("("+this+")");
	}catch(e){
		console.log(e);
		json = null;
	}
	return json;
};