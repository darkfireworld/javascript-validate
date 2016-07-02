(function($){
	"use strict";
	/*	
		HTML validate 标记:
			
	<input id="id"  validate="{ redirect:'rid', filter: 'val-> name ` msg ' 或者 ['val-> name`msg','name'] ,handler:' val->  name',result: ' val->  name'}"/>
			
			元素validate属性介绍:
				redirect : 重定向验证, 只能为目标的ID
				filter : 在调用 fire() , 元素发出fouceout , 或者 被重定向为目标元素 的时候被用于验证"数值"的 "验证短语" 组合 
				result : 为验证成功组合成JSON调用的函数名
				handler: 处理验证通过/失败的时候的函数(可以用来做一些额外的工作)
				
				filter中 "验证短句" 以 ` (ESC键下面的按钮) 符号分开
					"val-> name`msg" :
						val  : 替换jQuery.val 的函数名
						name : 注册的函数名
						msg  : 错误信息提示
					变种形式有
						'name'
						'name ` msg'
						'val -> name'
						
			各个元素都不是必要的元素, 最简单的写法为
				<input id="id"  validate="{}"/>
			这样子就表示,则调用 fire 函数的时候收集该input的输入结果
			
		常用API:
			
			$.validate.filter(name,fn,msg)           添加一个过滤器(公用)
			$.valdiate.result(name,fn)               添加一个 结果处理器(公用)
			$.validate.handler(name,fn)              添加一个 过程处理器(公用)
			$.validate.value(name,fn)                添加一个 val处理器(公用)
			
			var vTable = $.validate.build(id)        构建一个验证对象
			
			vTable.filter(name,fn,msg)               添加一个过滤器(私有)
			vTable.result(name,fn)                   添加一个 结果处理器(私有)
			vTable.handler(name,fn)                  添加一个 过程处理器(私有)
			vTable.value(name,fn)                    添加一个 val处理器(私有)
			
			vTable.prepare({name:'a'});     预配置结果对象, 最后通过 fire 方法获得对象预先添加的属性集合
			vTable.fire()                            返回 undefined 表示验证中出错, 否则返回一个组合完成的JSON对象
		
		四种类型函数模型介绍:
			value  : function(){
				参数:		无
				this: 		this指针指向当前被验证的DOM对象, 如input , div, select, 等
				返回结果: 	"数值"
				*注:   该函数只有使用 filter,handler,result 中默认this.val()才能访问到
			};
			filter : function(){
				
				参数:		无
				this: 		this指针指向当前被验证的DOM对象的jQuery包装
				返回结果: 	true 表示验证通过, 其他类型都一律表示验证失败, 其中如果返回
							结果为String类型的话, 则该返回msg会代替默认msg($.valdiate.filter 定义的msg)
				
			};
			handler : function(index,msg){
				参数:	index: -1 表示验证通过, 0-N 表示第几个验证项目失败
						msg :给定错误提示信息
				this: 	this指针指向当前被验证的DOM对象的jQuery包装
				返回结果: 忽略
			};
			result : function(result){
				参数:	result 当前组合成功的JSON对象
				this:	this指针指向当前被验证的DOM对象的jQuery包装
				返回结果: 忽略
			}
		
		插件中已经包含一些基本的验证函数(filter), 注意这些验证都是基于jQuery.val(), 特殊情况"数值"不能处理:
			@NotNull -- 非空(只要有数值既可以通过)
			@NotWithBlank -- 不能包含任何的空格
			@Mobile --- 手机号码
			@Telphone -- 电话号码
			@Email --- 邮箱
			@IdCard --- 身份证
			@Chinese --- 中文输入
			@Integer --- 整数
			@+Integer --- 正整数
			@-Integer --- 负整数
			@Number -- 数字输入
			@Word ---  单词输入[A-Za-z-0-9_]
			@Length --- 长度验证, 需要添加 length='{min:num,max:num}' 属性.
			@RegExp ---  正则验证, 需要添加 regexp='/[a-zA-Z0-9]{11}\d*\.+/gmi' 属性
		
		包含基本的handler:
			@Default: -- 	根据msg, 在出错的DOM后面, 添加一段提示, 可以自己指向错误提示的位置, 
							只需要在被验证DOM中添加 validate_default_handler_id 指向需要被添加验证文本输出的 DOM ID
			
		包含结果封装函数(result):
			@Default -- id:value的格式封装.(不指定, 则使用该函数)
			且以上两种封装都支持id为 o1.o2.o3  的结果组合, 注意使用了这种方式来组合结果的id, 则使用jQuery的时候需要添加转义字符\\
		如 $('o1\\.o2\\.o3');
		
		包含value 封装
			@Default --- 和jQuery.val 一样
			@Radio --- 获取子节点radio中被选中的数值
		
	*/
	var undefined = window.undefined;
	if($.validate !== undefined)
		throw new Error(" $.validate 已经存在");
	
	/* 用于配置filter , handler 以及 result 三种Map*/
	var fly = function(){};
	fly.prototype = {
		__filterMap__:undefined, //仅仅标记存在该属性
		__handlerMap__:undefined,//仅仅标记存在该属性
		__resultMap__:undefined,//仅仅标记存在该属性
		__valueMap__:undefined,//仅仅标记存在该属性
		filter:function(name,fn,msg){
			if(	$.type(name) != 'string' 
				|| /^\s+$/.test(name)
				|| $.type(fn) != 'function' 
				|| $.type(msg) != 'string' 
				|| /^\s+$/.test(msg) ){
					throw new Error('API的格式为 name,fn,msg ');
				
			}
			//注意 this 指向$.validate 或者 $.validate("#id") 的对象
			if(!!this.__filterMap__[name]){
				throw new Error('命名(name) :'+ name +'已经存在于当前对象的 __filterMap__ 中, 不能重复添加');
			}
			/**
				__filterMap__:{
					name : {
						fn:fn,
						msg:msg
					}
				};
			
			*/
			this.__filterMap__[name] = {
				fn:fn,
				msg:msg
			};
			
		},
		handler:function(name,fn){
			if(	$.type(name) != 'string' 
				|| /^\s+$/.test(name)
				|| $.type(fn) != 'function' ){
					throw new Error('API的格式为 name,fn');
				
			}
			//注意 this 指向$.validate 或者 $.validate("#id") 的对象
			if(!!this.__handlerMap__[name]){
				throw new Error('命名(name) :'+ name +'已经存在于当前对象的 __handlerMap__ 中, 不能重复添加');
			}
			/**
				__handlerMap__:{
					name : fn
				};
			
			*/
			this.__handlerMap__[name] = {fn:fn};
		},
		result:function(name,fn){
			if(	$.type(name) != 'string' 
				|| /^\s+$/.test(name)
				|| $.type(fn) != 'function' ){
					throw new Error('API的格式为 name,fn');
				
			}
			//注意 this 指向$.validate 或者 $.validate("#id") 的对象
			if(!!this.__resultMap__[name]){
				throw new Error('命名(name) :'+ name +'已经存在于当前对象的 __resultMap__ 中, 不能重复添加');
			}
			/**
				__resultMap__:{
					name : fn
				};
			
			*/
			this.__resultMap__[name] = {fn:fn};
			
		},value:function(name,fn){
			if(	$.type(name) != 'string' 
				|| /^\s+$/.test(name)
				|| $.type(fn) != 'function' ){
					throw new Error('API的格式为 name,fn');
				
			}
			//注意 this 指向$.validate 或者 $.validate("#id") 的对象
			if(!!this.__valueMap__[name]){
				throw new Error('命名(name) :'+ name +'已经存在于当前对象的 __valueMap__ 中, 不能重复添加');
			}
			/**
				__valueMap__:{
					name : fn
				};
			
			*/
			this.__valueMap__[name] = {fn:fn};
			
		}
	
	};

	/*jQuery Validate*/
	$.validate = (function(){
		var fn = function(){
			this.__filterMap__ = {};
			this.__handlerMap__= {};
			this.__resultMap__ = {};
			this.__valueMap__={};
		};
		fn.prototype = new fly();
		/*构造验证单元的API*/
		fn.prototype['build'] = function(sel){
			var $we = $('#'+sel);
			if($we.length != 1)
				throw new Error('没有指定id: '+sel+'的对象或者存在多个');
			//构造具体的对象
			return new $mock($we);
		};
		return new fn();
	})();
	
	/*具体针对某一个DIV进行验证的 jQuery Validate 对象*/
	var $mock = (function(){
		//具体的构造函数
		var fn = function($we){
			this.__$we__ = $we;
			this.__filterMap__ = {};
			this.__handlerMap__= {};
			this.__resultMap__ = {};
			this.__valueMap__={};
			var that = this;
			/*对所在的$we开启监听blur事件*/
			$we.on('focusout',function(e){
				//检测是否具有validate
				var me = e.target;
				var $me = $(me);
				//如果存在validate属性, 则验证该元素
				if($me.attr('validate') != null)
					that.__run__(me,undefined);
				//继续冒泡
				return true;
			});
		};
		/*属性表*/
		var prop = {
			__$we__:undefined,//仅仅表示存在该属性
			__isFire__ : false, //是否处于结果搜集状态 
			/*对某一个带有validate的元素进行验证*/
			__run__ : (function(){
				/*
					1. 获得validate 属性
					2. 检测是否存在redirect, 如果存在,则重定向到具体的元素进行验证
					3. 根据filter验证
					4. 调用handler处理结果
					5. 调用result组装
					6. 返回本次 __run__ 是否成功 true | false
					
				*/
				var fn = function(me,result){
					var $me = $(me);
					
					/*解析validate元素*/
					var vObject = parseValidate($me);
					
					/*转发redirect到指定的条目进行验证*/
					if($.type(vObject.redirect) =='string' ){
						var $r = $('#'+vObject.redirect);
						if($r.length != 1)
							throw new Error('redirect 的ID :'+vObject.redirect+ '为多个 或者 为空');
						
						/*如果处于收集结果阶段, 则忽略具有redirect的条目*/
						if($.type(result) != 'object')
							return this.__run__($r[0],result);
						else
							return true;
					}
					
					/*进入验证阶段*/
					var msg = undefined;
					var pass = true;
					var index = 0;
					
					/*过滤器验证*/
					var filter = vObject.filter;
					for(index=0; index < filter.length; ++index){
					
						var callName = filter[index].callName;
						var valueName = filter[index].valueName;
	
						var retVal = callMe.call(this,valueName,'__filterMap__',callName,me,[]);
						if(retVal === true)
							continue;
						/*
							出现异常, 选择一个合适的msg
							L1 : FROM HTML
							L2 : FROM FILTER
							L3 : DEFAULT MSG
						*/
						msg =  ( filter[index].msg 
										|| ( $.type(retVal) == 'string' && retVal )
										|| ( this.__filterMap__[callName] || {} ).msg 
										|| ( $.validate.__filterMap__[callName] || {} ).msg );
						pass = false;
						//跳出处理错误
						break;
					}
					//调用handler
					callMe.call(this,vObject.handler.valueName,'__handlerMap__',vObject.handler.callName,me,[pass === true ? -1: index,msg]);
					//如果验证通过 且 result  == object , 则表示需要对结果进行组合处理
					if(!!pass && $.type(result) == 'object'){
						callMe.call(this,vObject.result.valueName,'__resultMap__',vObject.result.callName,me,[result]);
					}
					//返回验证结果
					return pass;
				};
				/*
					调用具体的HOOK
					valueName:替换 jQuery.val 的函数,[undefined|string]
					map:某一种类型的map如 __valueMap__ [string]
					callName:具体调用的函数命名
					me:DOM对象
					args:参数
				*/
				var callMe = function(valueName,map,callName,me,args){
					var $me = $(me);
					if(valueName != undefined){
						var valueFn = ( this.__valueMap__[valueName] || $.validate.__valueMap__[valueName] ||{} ).fn;
						if($.type(valueFn) != 'function')
							throw new Error('__valueMap__ :'+valueName+'不存在或者不是函数');
						/*置换val函数*/
						$me.val = function(){
							return valueFn.apply(me,arguments);
						};
					
					}
					var callFn = (this[map][callName] ||  $.validate[map][callName] || {}).fn;
					if($.type(callFn) != 'function')
						throw new Error(map + ' : '+ callName + '不存在或者不是函数');
					return callFn.apply($me,args);
				};
				/*
					返回结果:
					{
						filter:[{valueName:'@Default',callName:'@NotNull',msg:'msg'}],
						handler:{valueName:undefined,callName:'@Default'},
						result:{valueName:undefined,callName:'@Default'},
						redirect:undefined 
					}
				*/
				var parseValidate = function($me){
					
					var vStr = $.trim($me.attr('validate'));
					if( vStr == '')
						throw new Error(' validate 属性不能为空');
					//构建vObject
					var vObject = $.extend({
						filter:[],
						handler:'@Default', //默认的handler处理
						result:'@Default',//默认的result处理
						redirect:undefined
					
					},eval('(' + vStr + ')'));
					
					//转换filter为String的时候, 统一转换为[]
					if($.type(vObject.filter) == 'string')
						vObject.filter = [vObject.filter];
					/*处理各个filter对象*/
					for(var i=0;i<vObject.filter.length;++i){
						var arr = vObject.filter[i].split('`');
		
						if(arr[0] == '')
							throw new Error('filter的 name 不能为空');
						var item = parseExp($.trim(arr[0]));
						
						if(arr.length >= 2){
							var msg = $.trim(arr[1]);
							if(msg == '')
								throw new Error('filter的 msg 不能为空');
							item.msg = msg;
						}
						//放入处理完毕的"短语"
						vObject.filter[i] = item;
					}
					
					//处理 redirect handler result
					vObject.handler = parseExp($.trim(vObject.handler));
					vObject.result = parseExp($.trim(vObject.result));
					vObject.redirect = ( vObject.redirect === undefined ? undefined : $.trim(vObject.redirect));
					
					if($.type(vObject.redirect) != 'undefined' && $.type(vObject.redirect) != 'string'  )
						throw new Error('redirect 属性出现异常');
					
					return vObject;
					
				};
				/*
					解析 val->fn 表达式
					解析返回{
						valueName:undefined,
						callName:undefined
					},
					失败返回undefined
					
				*/
				var parseExp = function(exp){

					exp = $.trim(exp);
					/*如果表达式为空, 则使用默认表达式*/
					if(exp == '')
						throw new Error('表达式不能为空白');
						
					/*处理 -> 表达式*/
					var arr = exp.split('->');
					
					if(arr.length > 2)
						throw new Error('表达式 exp:'+exp+'存在多个 -> 表达式');
					
					/*剔除空白*/
					for(var i=0;i<arr.length;++i){
						arr[i] = $.trim(arr[i]);
					}
					
					var ret = {
						valueName:undefined, //表示不调用任何value函数
						callName:undefined //该项不能为undefined, 这里仅仅表示该属性存在
					};
					
					if(arr.length == 2){
						if(arr[0] != '')
							ret.valueName= arr[0];
						
						/* callName 处理*/
						if(arr[1] != '')
							ret.callName = arr[1];
						else
							throw new Error('表达式 exp:'+exp+'不存在 callName ');
					}else{
						/* callName 处理*/
						if(arr[0] != '')
							ret.callName = arr[0];
						else
							throw new Error('表达式 exp:'+exp+'不存在 callName ');
					}
					
					return ret;
				};
				
				
				return fn;
			
			})(),
			isFire : function(){
				return this.__isFire__;
			},
			fire :function(){
			
				this.__isFire__ = true;
				
				try{
					//初始化一个基本的对象
					var result = $.extend(true,{},this.__one__);
					//收集具有validate属性的元素
					var $we = this.__$we__;
					var ok = true;
					var that = this;
					$we.find('[validate]').each(function(){
						//验证各个元素
						if(ok === true)
							ok = that.__run__(this,result);
						else
							that.__run__(this);
					
					});
					//检测结果是否OK
					if(ok === true)
						return result;
					return undefined;
				}catch(e){
					throw e;
				}finally{
					this.__isFire__ = false;
				}
			},
			prepare:function(some){
				//所有的result对象都以这个为模版
				this.__one__ = some;
			}
		};
		fn.prototype = new fly();
		for(var name in prop){
			fn.prototype[name] = prop[name];
		}
		return fn;
	})();
	
	/*添加默认验证函数*/
	(function(){
	
		/*过滤器验证函数*/
		(function(){
			//非空
			var vNull = function(){
				var val = this.val();
				if(/^\s*$/.test(val))
					return false;
				return true;
			};
			$.validate.filter('@NotNull',vNull,'该条目不能为空');
			//非空
			var vNotWithBlank = function(){
				var val = this.val();
				if(/^\S+$/.test(val))
					return true;
				return false;
			};
			$.validate.filter('@NotWithBlank',vNotWithBlank,'该条目不能包含任何的空格');
			
			//手机号码
			var vMobile = function(){
				var val = this.val();
				if(/^(\d{11})?$/.test(val))
					return true;
				return false;
			};
			$.validate.filter('@Mobile',vMobile,'请输入正确手机号码');
			//电话号码
			var vTelphone = function(){
				var val = this.val();
				if(/^[0-9-]*$/.test(val))
					return true;
				return false;
			};
			$.validate.filter('@Telphone',vTelphone,'请输入正确电话号码');
			//邮箱
			var vEmail = function(){
				var val = this.val();
				if(/^(\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*)?$/.test(val))
					return true;
				return false;
			};
			$.validate.filter('@Email',vEmail,'请输入正确邮箱');
			//身份证
			var vIdCard = function(){
				var val = this.val();
				if(/^(\d{18}|\d{15})?$/.test(val))
					return true;
				return false;
			};
			$.validate.filter('@IdCard',vIdCard,'请输入正确身份证');
			//汉字
			var vChinese = function(){
				var val = this.val();
				if(/^([\u4e00-\u9fa5]{0,})?$/.test(val))
					return true;
				return false;
			};
			$.validate.filter('@Chinese',vChinese,'请输入汉字');
			
			
			//整数
			var vInteger = function(){
				var val = this.val();
				if(/^(-?[1-9]\d*)?$/.test(val))
					return true;
				return false;
			};
			$.validate.filter('@Integer',vInteger,'请输入整数');
			
			//正整数
			var vZInteger = function(){
				var val = this.val();
				if(/^\d*$/.test(val))
					return true;
				return false;
			};
			$.validate.filter('@+Integer',vZInteger,'请输入正整数');
			
			//负整数
			var vFInteger = function(){
				var val = this.val();
				if(/^(-\d*)?$/.test(val))
					return true;
				return false;
			};
			$.validate.filter('@-Integer',vFInteger,'请输入负整数');
			
			//数字
			var vNumber = function(){
				var val = this.val();
				if(/^\d*$/.test(val))
					return true;
				return false;
			};
			$.validate.filter('@Number',vNumber,'请输入数字');
			
			
			//[A-Za-z0-9_]
			var vWord = function(){
				var val = this.val();
				if(/^[0-9A-Za-z_]*$/.test(val))
					return true;
				return false;
			
			};
			$.validate.filter('@Word',vWord,'请输入单词');
			
			//长度检测 attr : length = '{min:num,max:num}'
			var vLength = function(){
				var val = this.val();
				var length = this.attr('length');
				if(length == undefined || length == '')
					throw new Error('@Length 验证需要添加length 属性到DOM中');
					
				var lo = eval('(' + length + ')');
				var min = 0 ;
				var max = 999999999999999;
				
				//验证lo对象中的属性
				if($.type(lo.min) != 'undefined'){
					
					if($.type(lo.min) != 'number')
						throw new Error(this+' length 中 max 属性需要为数字类型');
					if(lo.min <= 0)
						throw new Error(this + 'length 中 max 属性需要大于0');
						
					min = lo.min;
				}
				//验证lo对象中的属性
				if($.type(lo.max) != 'undefined'){
					
					if($.type(lo.max) != 'number')
						throw new Error(this+' length 中 max 属性需要为数字类型');
					if(lo.max <= 0)
						throw  new Error(this + 'length 中 max 属性需要大于0');
					
					max = lo.max;
				}
				//空字符串不进行验证, 可以通过@Notnull来验证是否为空
				if( $.type(val) != 'string' || val == '')
					return true;
				if( val.length >= min && val.length <= max)
					return true;
				return false;
			};
			$.validate.filter('@Length',vLength,'输入的字符串长度不正确');
			
			//正则验证
			var vRegExp = function(){
				var val = this.val();
				var regexStr = this.attr('regexp');
				if(regexStr == undefined || regexStr == '')
					throw new Error('@RegExp验证需要添加regexp支持');
				//验证
				var re = eval('('+regexStr+')');
				if(re.test(val))
					return true;
				return false;
			};
			$.validate.filter('@RegExp',vRegExp,'正则表达验证不通过');
			
		})();
		
		/*处理器函数*/
		(function(){
		
		
			$.validate.handler('@Default',function(index,msg){
				var $this = this;
				/*首先清除 默认提示(如果有) */
				var eid = $this.attr("validate_default_handler_id");
				if(eid != undefined && eid != ''){
					//清空错误提示
					$("#"+eid).html('');
					//隐藏
					$("#"+eid).hide();
				}
				//验证成功, 则立马返回, 否则输出默认提示
				if(index === -1)
					return;
				//输出错误提示
				if(eid == undefined || eid == ''){
					//随机数
					eid = Math.floor(Math.random() * 0x100000000000000);
					$this.attr('validate_default_handler_id',eid);
					//添加一个默认的提示栏
					var top = $this.offset().top;
					var left = $this.offset().left + $this.outerWidth()+10;
					var divStr = '<div id="'+eid+'" style="position:absolute;top:'+ top+'px;left:'+left+'px;color: #b94a48;font-weight: bold;"></div>';
					//$this.parent().append(divStr);
					$('body').append(divStr);
				}
				//检测EID的tip数量
				if($("#"+eid).length != 1)
					throw new Error('validate_default_handler_id 为: '+eid + '指向的DOM为空或者多个');
				//添加提示信息
				$("#"+eid).html(msg);
				//显示
				$("#"+eid).show();
			});
		
		})();
		
		
		/*结果组合函数*/
		(function(){
			//支持以 o1.o2.o3 = 3的结果处理方式
			var support = function(res,key,val){
				var arr = key.split('.');
				var o = res;
				for(var i=0;i< arr.length -1;++i){
					if($.type(o[arr[i]]) != 'object' && $.type(o[arr[i]]) != 'undefined')
						throw new Error('结果对象在处理key: '+key +'的时候遇到第'+i+'个分解:'+arr[i]+'的时候不为一个对象或者undefined');
					//空的时候添加数据
					if(o[arr[i]] == undefined)
						o[arr[i]] = {};
					o = o[arr[i]];
				}
				//添加数据到结果集合中
				o[arr[arr.length-1]] = val;
			};
			$.validate.result('@Default',function(result){
				var $this = this;
				var val = $.trim($this.val());
				var id = $.trim($this.attr('id'));
				
				if(id == undefined || id == ''){
					throw new Error('该条目没有id, 无法使用@Default result 处理器');
				}
				support(result,id,val);
			});
			
		})();
		
		/*
			value @Default
		*/
		(function(){
			$.validate.value('@Default',function(){
				//this = DOM
				return $(this).val();
			});
			
			$.validate.value('@Radio',function(){
			
				return $(this).find('input:checked').val() || '';
			});
		})();
	})();
		
})(jQuery);