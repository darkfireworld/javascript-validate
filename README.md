validate
========
基于HTML配置的验证JS:
	支持 事件验证，结果验证，对象组装
	
	
<html>
	<head>
		<script src="jquery.js"></script>
		<script src="jquery.validate.js"></script>
		<script type="text/javascript">
		$(function(){
			$.validate.helper('@Cantll','不能为空',function(){
				var val = $(this).val();
					if(/^\S+$/.test(val))
						return true;
					return false;
			});
			//添加自定义结果处理函数
			$.validate.helper('@Res',function(res){
				var val = $(this).val();
				res['myattr'] = val;
			});
			
			var vTable = $.validate('form');
			//预处理
			vTable.validate.prepare({name:'hello'});
			$('#d').click(function(){
				
				alert(JSON.stringify(vTable.validate()));
			
			});
			
		});
		</script>
	</head>
	
	<body>
	
		<div id="form">
			<table>
				<tr>
					<!--基本验证  和 事件监听-->
					<td><input id="a"  validate="{blur:'@Notnull',valid:'@Notnull'}"/></td>
				</tr>
				<tr>
					<!--使用自定义组装-->
					<td><input id="b"  validate="{valid:'@Notnull',res:'@Res'}"/></td>
				</tr>
				<tr>
					<!--使用元素上的提示-->
					<td><input id="c"  validate="{valid:'@Notnull`特殊提示'}"/></td>
				</tr>
				<tr>
					<!--多项验证-->
					<td><input id="m"  validate="{valid:['@Email`请输入正确邮箱`']}"/></td>
				</tr>
				
				<tr>
					<!--自定义错误提示位置和样式-->
					<td><input id="m"  validate="{valid:['@Notnull','@Email`请输入正确邮箱`']}" eid="TIP"/></td>
				</tr>
				
				<tr>
					<td><span id="TIP"></span></td>
				</tr>
				<tr>
					<td><input id="d" type="submit"/></td>
				</tr>
				
			</table>
		</div>
	</body>
</html>