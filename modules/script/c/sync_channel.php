<?php
class SyncChannelHandler extends bk\core\HttpRequestHandler{

	function getModel($modelName){
		if (empty($this->model)) {
			require_once dirname(__FILE__)."/../m/$modelName.php";
			$this->model = new $modelName();
		}
		return $this->model;
	}
	function getLiveUrl($apiServer,$cid){
	    $api = "http://$apiServer/api/getCDNByChannelId/$cid";
	    $ret = CurlUtils::get($api);
	    $ret = json_decode($ret);
	    $server = null;
	    $streamName = null;
	    if($ret && isset($ret->streams)){
			foreach( $ret->streams as $k=>$v ){
			    if(isset($v->cdnlist) && count($v->cdnlist)>0){
					$server = $v->cdnlist[0];
					$streamName = $k;
					break;
			    }
			}
  	    }
	    if($server){
			return "http://$server/channels/".$ret->customer_name."/".$ret->channel_name."/m3u8:$streamName";
        }	
	    return null;
	}
	function getEpgUrl($apiServer, $cid){
	    $api = "http://$apiServer/api/getEPGByChannelTime/$cid/0/{timestamp}";
	    return $api;
	}
	function getCateId($cname){
		$groupConf = array(
				array(
					"key"=>"中央 央视 CCTV",
					"cate_id"=>1
				)
			);
		foreach ($groupConf as $key => $conf) {
			$kws = explode(" ", $conf["key"]);
			$flag = false;
			foreach ($kws as $i => $kw) {
				$pos = mb_strpos($cname, $kw);
				if($pos !== false){
					$flag = true;
					break;
				}
			}
			if($flag)
				return $conf["cate_id"];
		}
		return 2;
	}
	function syncChannelsParam(){
		return array(
				"apiServer"=>array("type"=>"string","default"=>"")
			);
	}
	function syncChannels($param){
		$apiServer = $param["apiServer"];
		$api = "http://$apiServer/api/getChannels";

		//获取全部频道列表
	    $ret = CurlUtils::get($api);
	    $ret = json_decode($ret);
	    $keyMap = array("id"=>"channel_id", "display_name"=>"name");
	    $status = bk\core\Status::status();
	    $results = array();
	    //处理数据 更新到数据库
	    if($ret && isset($ret->result)){
			$channels = $ret->result;
			foreach( $channels as $k => $v ){
				$channel = array();
				foreach( $keyMap as $k2 => $v2 )
			    	$channel[$v2] = $v->$k2;
			    $pic = $v->pic;
			    if($pic)
			    	$pic = "http://$apiServer$pic";
			    $channel["live_url"] = $this->getLiveUrl($apiServer, $channel["channel_id"]);
			    $channel["sync_epg_api"] = $this->getEpgUrl($apiServer, $channel["channel_id"]);
				$channel["cate_id"] = $this->getCateId($channel["name"]);
			    $channel["icon"] = $pic;
				$channel["type"] = $channel["cate_id"] == 6 ? "radio" : "tv";

			    $ret = $this->db->insert("channel", $channel);
			    if($ret){
			    	$channel["state"] = $ret;
			    }else{
			    	$channel["error"] = $this->db->last_error;
			    }
				array_push($results, $channel);
			}
	    }
	    $status->data = $results;
	    return $status;
	}

	function syncChannelEpg($epgApi, $cid){
		
		$ret = CurlUtils::get($epgApi);
		$ret =  json_decode($ret);
	    $results = array();
		if ($ret && $ret->result){
			$list = $ret->result;
			foreach( $list as $epgs ){
				foreach( $epgs as $item){
					$epg = objectToArray($item);
					$epg["channel_id"] = $cid;
					$epg["program"] = parseProgramName($epg["name"]);
					$epg["program_index"] = parseProgramIndex($epg["name"]);
					$ret = $this->db->insert("epg", $epg);
					if ($ret) {
						$epg["status"] = $ret;
					}else{
						$epg["error"] = $this->db->last_error;
					}
					$results[] = $epg;
				}
			}
		}
		return $results;
	}
	function syncEpgsParam(){
		return array(
				"apiServer"=>array("type"=>"string"),
				"day"=>array("type"=>"int","default"=>0),
			);
	}
	function syncEpgs($param){
		$apiServer = $param["apiServer"];
		$timestamp = time()+$param["day"]*24*3600;

		$channels = $this->db->select("channel",null, array("status"=>1));
		if (!$channels) {
			$status = bk\core\Status::status();
			$status->error = $this->db->last_error;
			return $status;
		}
		$status = bk\core\Status::status();
		$results = array();
		foreach($channels as $channel){
			$cid = $channel->channel_id;
			$epgApi = str_replace("{timestamp}", $timestamp, $channel->sync_epg_api);
			//$result = $this->syncEpg($apiServer, $cid);
			$result = $this->syncChannelEpg($epgApi, $cid);
			if( !empty($result)) {
				$result = array("list"=>$result); 
				$result["url"] = $epgApi;
			}else{
				$result = array("url"=>$epgApi);
			}

			$results[] = $result;
		}
		$status->data = $results;
		return $status;
	}
}