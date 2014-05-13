#!/usr/bin/env python
#coding=utf-8
from constants import DBConstant
import MySQLdb
import re

import sys 
reload(sys) 
sys.setdefaultencoding('utf-8')


class DB:
	def __init__(self):
		self.conn = MySQLdb.connect(host=DBConstant.DB_HOST, user=DBConstant.DB_USER, passwd=DBConstant.DB_PWD, db=DBConstant.DB_NAME,charset="utf8")
		self.cursor = self.conn.cursor(cursorclass=MySQLdb.cursors.DictCursor)

	def test(self):
		self.cursor.execute("select version()")
		row = self.cursor.fetchone()
		print "test result:", row
		#self.conn.close()
	#@param a:article
	def addItem(self,a):
		sql = "INSERT INTO wp_channel_live_source (icon,name,source, rate, live_url, reference_url) VALUES(%s,%s,%s,%s,%s,%s)"
		param = (
				a.get("icon"),
				a.get("name"),
				a.get("source"),
				a.get("rate"),
				a.get("live_url"),
				a.get("reference_url")
				)
		rowid = 0
		try:
			print param
			self.cursor.execute(sql, param)
			self.conn.commit()
			rowid = self.cursor.lastrowid
		except Exception, e:
			print "add item exception:", a.get("name"), e
			rowid = 0
		return rowid
	def where(self,p):
		where = None
		for k in p:
			v = p[k]
			if where is None:
				where = ""
			else:
				where = where + " AND "
			if v is None:
				where = where+" "+k+" is NULL "
			else:
				where = where + " "+k+"='"+str(v)+"' "
		return where

	def close(self):
		self.cursor.close()
		self.conn.close()

#db = DB()
#print db.hasContent(1)