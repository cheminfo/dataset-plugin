package org.cheminfo.scripting.dataset.tests;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;

import org.cheminfo.function.scripting.ScriptingInstance;
import org.json.JSONObject;

public class TestScripting {


	/**
	 * Run this to test a script
	 * @param args
	 */
	public static void main(String[] args) {
		// we could specify a path where other plugins could be found
		ScriptingInstance interpreter = new ScriptingInstance("");
		
		// we can not escape the folder specified by setSafePath
		// it should be specified otherwise no disk access is possible
		interpreter.setSafePath("./");
		
		// we can load a javascript file to execute
		String script = getContents(new File("script/test.js"));
		JSONObject result = interpreter.runScript(script);
		System.out.println(result);
		
	}
	
	static public String getContents(File aFile) {
		try {
			System.out.println(aFile.getCanonicalPath());
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	    //...checks on aFile are elided
	    StringBuilder contents = new StringBuilder();
	    
	    try {
	      //use buffering, reading one line at a time
	      //FileReader always assumes default encoding is OK!
	      BufferedReader input =  new BufferedReader(new FileReader(aFile));
	      try {
	        String line = null; //not declared within while loop
	        /*
	        * readLine is a bit quirky :
	        * it returns the content of a line MINUS the newline.
	        * it returns null only for the END of the stream.
	        * it returns an empty String if two newlines appear in a row.
	        */
	        while (( line = input.readLine()) != null){
	          contents.append(line);
	          contents.append(System.getProperty("line.separator"));
	        }
	      }
	      finally {
	        input.close();
	      }
	    }
	    catch (IOException ex){
	      ex.printStackTrace();
	    }
	    return contents.toString();
	}

}
