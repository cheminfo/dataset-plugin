package org.cheminfo.scripting.dataset.tests;

import junit.framework.Assert;

import org.cheminfo.function.scripting.ScriptingInstance;
import org.json.JSONObject;
import org.junit.Test;

public class JunitTest {

	@Test
	public void test() {
		//You can run this method for testing the behavior of you functions inside javascript.
		//Before using this function, build the .jar by running build.xml. Only so you will see the changes made in Image.java
		ScriptingInstance interpreter = new ScriptingInstance("./workspace/imagePlugin/jars/");
		
		JSONObject result = interpreter.runScript("var result=IJ.helloWorld('Castillo'); jexport('theNametoShow',result)");
		
		Assert.assertEquals("{\"result\":{\"theNametoShow\":\"Castillo, Hello World!\"}}", result.toString());
		
	}
}
