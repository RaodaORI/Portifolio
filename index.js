const express = require("express");
const app = new express();
const ejs = require("ejs");
const bodyParser = require("body-parser");
const pg = require("pg");

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "permalist",
  password: "postgres",
  port: 5432,
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.set("view engine", "ejs");
//////////////////////////////////////////////////////////////

// Home route -> Display tasks, descriptions, and tags, with error handling
app.get("/", async (req, res) => {
  try {
    // Active tasks
    const activeTasks = await db.query(`
      SELECT p.id, p.tasks, p.type, d.descr, d.tags
      FROM permalists p
      LEFT JOIN tasks_detail d ON p.id = d.task_id
      WHERE p.type = 1
      ORDER BY p.id DESC
    `);

    // Finished tasks
    const finishedTasks = await db.query(`
      SELECT p.id, p.tasks, p.type, d.descr, d.tags
      FROM permalists p
      LEFT JOIN tasks_detail d ON p.id = d.task_id
      WHERE p.type = 2
    `);

    res.render("index", {
      data: activeTasks.rows, // tasks + description
      dataf: finishedTasks.rows, // finished tasks + description
    });
  } catch (error) {
    console.error("Error executing query", error.stack);
    res.send("Error fetching tasks");
  }
});

// Add task route -> Insert new task and associated description, with error handling
app.post("/action", async (req, res) => {
  const task = req.body["text"] || "No Title";
  const on = 1;

  try {
    // STEP 1: Insert into permalists FIRST and get the new ID
    const taskResult = await db.query(
      "INSERT INTO permalists (tasks, type) VALUES ($1, $2) RETURNING id",
      [task, on]
    );

    if (!task) {
      return res.status(400).send("Task title is required");
    }
    res.redirect("/"); // ✅ after insert, reload home
  } catch (error) {
    console.error("Error executing query", error.stack);
    res.send("Error adding task");
  }
});

app.post("/delete", async (req, res) => {
  const id = req.body.idDelete;
  try {
    await db.query("DELETE FROM tasks_detail WHERE task_id = $1", [id]);
    await db.query("DELETE FROM permalists WHERE id = $1", [id]);

    res.redirect("/"); // ✅ after delete, reload home
  } catch (error) {
    console.error("Error executing query", error.stack);
    res.sendStatus(500); // ❌ send error status on failure
  }
});

//delete all route
app.post("/deleteall", async (req, res) => {
  const taskId = req.body.taskId;

  try {
    await db.query("DELETE FROM tasks_detail"); // Delete all tasks
    await db.query("DELETE FROM permalists WHERE type = 1"); // Delete all tasks

    res.redirect("/"); // ✅ after delete all, reload home
  } catch (error) {
    console.error("Error executing query", error.stack);
    res.sendStatus(500); // ❌ send error status on failure
  }
});
app.post("/finished", async (req, res) => {
  const finishedId = req.body.idFinished;
  try {
    // Logic for marking a task as finished would go here
    let query = "UPDATE permalists SET type = 2 WHERE id = $1"; // Update query to mark as finished
    await db.query(query, [finishedId]); // Execute the update query

    res.redirect("/"); // ✅ after marking as finished, reload home
  } catch (error) {
    console.error("Error executing query", error.stack);
    res.sendStatus(500); // ❌ send error status on failure
  }
});

app.post("/unfinished", async (req, res) => {
  const unfinishId = req.body.idUnfinished;
  try {
    // Logic for marking a task as unfinished would go here
    let query = "UPDATE permalists SET type = 1 WHERE id = $1"; // Update query to mark as unfinished
    await db.query(query, [unfinishId]); // Execute the update query

    res.redirect("/"); // ✅ after marking as unfinished, reload home
  } catch (error) {
    console.error("Error executing query", error.stack);
    res.sendStatus(500); // ❌ send error status on failure
  }
});

app.post("/edit", async (req, res) => {
  const editId = req.body.editIds; // Placeholder for task ID to edit
  const editText = req.body.editlast; // Placeholder for new task text
  try {
    // Logic for editing a task
    let query = "UPDATE permalists SET tasks = $1 WHERE id = $2;"; // Update query to edit task

    await db.query(query, [editText, editId]); // Execute the update query

    res.redirect("/"); // ✅ after editing, reload home
  } catch (error) {
    console.error("Error executing query", error.stack);
    res.sendStatus(500); // ❌ send error status on failure
  }
});

//subtask into tasks_detail
app.post("/sub", async (req, res) => {
  const subtask = req.body.subtask || "No Subtask";
  const taskId = req.body.taskId; // You need to pass taskId from the form
  const description = req.body.description;

  try {
    //submit subtask description and tags
    await db.query(
      "INSERT INTO tasks_detail (task_id, descr, tags, task_sub) VALUES ($1, $2, $3, $4)",
      [taskId, description || "", "", subtask]
    );

    res.redirect("/"); // ✅ after insert, reload home
  } catch (error) {
    console.error("Error executing query", error.stack);
    res.send("Error adding subtask");
  }
});

//////////////////////////////////////////////////////////////

app.listen(3000); //
