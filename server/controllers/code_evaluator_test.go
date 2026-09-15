package controllers

import (
	"testing"
)

func TestExecuteBackendFastAPI(t *testing.T) {
	code := `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

app = FastAPI()

class Task:
    def __init__(self, id: int, title: str, completed: bool = False):
        self.id = id
        self.title = title
        self.completed = completed

class CreateTask(BaseModel):
    title: str = Field(min_length=1)
    completed: Optional[bool] = False

class UpdateTask(BaseModel):
    completed: bool

tasks = [
    Task(1, "Learn Go", False)
]

next_id = 2

def task_to_dict(task: Task):
    return {
        "id": task.id,
        "title": task.title,
        "completed": task.completed
    }

@app.post("/tasks", status_code=201)
def create_task(data: CreateTask):
    global next_id
    if not data.title.strip():
        raise HTTPException(
            status_code=400,
            detail="Title cannot be empty"
        )
    task = Task(
        id=next_id,
        title=data.title,
        completed=data.completed
    )
    next_id += 1
    tasks.append(task)
    return task_to_dict(task)

@app.get("/tasks")
def get_tasks():
    return [
        task_to_dict(task)
        for task in tasks
    ]

@app.patch("/tasks/{task_id}")
def update_task(task_id: int, data: UpdateTask):
    for task in tasks:
        if task.id == task_id:
            task.completed = data.completed
            return task_to_dict(task)
    raise HTTPException(
        status_code=404,
        detail="Task not found"
    )
`

	testCases := []EvalTestCase{
		{
			Index:          1,
			Input:          "POST /tasks\n{\"title\":\"Build API\"}",
			ExpectedOutput: "201\n{\"id\":2,\"title\":\"Build API\",\"completed\":false}",
		},
		{
			Index:          2,
			Input:          "PATCH /tasks/1\n{\"completed\":true}",
			ExpectedOutput: "200\n{\"id\":1,\"title\":\"Learn Go\",\"completed\":true}",
		},
	}

	results, err := executePython(code, testCases, false)
	if err != nil {
		t.Fatalf("executePython failed: %v", err)
	}

	for _, res := range results {
		t.Logf("Result index %d: Passed=%v, Actual=%q", res.Index, res.Passed, res.Actual)
		if !res.Passed {
			t.Errorf("Test case %d failed:\nExpected:\n%s\nGot:\n%s", res.Index, res.Expected, res.Actual)
		}
	}
}

func TestExecuteBackendGo(t *testing.T) {
	code := `package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

type Task struct {
	ID        int    ` + "`json:\"id\"`" + `
	Title     string ` + "`json:\"title\"`" + `
	Completed bool   ` + "`json:\"completed\"`" + `
}

var tasks = []Task{
	{ID: 1, Title: "Learn Go", Completed: false},
}
var nextID = 2

func handleTasks(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method == "POST" && r.URL.Path == "/tasks" {
		var input struct {
			Title     string ` + "`json:\"title\"`" + `
			Completed bool   ` + "`json:\"completed\"`" + `
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.Title == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid title"})
			return
		}

		task := Task{
			ID:        nextID,
			Title:     input.Title,
			Completed: input.Completed,
		}
		nextID++
		tasks = append(tasks, task)

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(task)
		return
	}

	if r.Method == "PATCH" && strings.HasPrefix(r.URL.Path, "/tasks/") {
		idStr := strings.TrimPrefix(r.URL.Path, "/tasks/")
		id, _ := strconv.Atoi(idStr)

		var input struct {
			Completed bool ` + "`json:\"completed\"`" + `
		}
		json.NewDecoder(r.Body).Decode(&input)

		for i := range tasks {
			if tasks[i].ID == id {
				tasks[i].Completed = input.Completed
				w.WriteHeader(http.StatusOK)
				json.NewEncoder(w).Encode(tasks[i])
				return
			}
		}

		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not Found"})
		return
	}

	w.WriteHeader(http.StatusNotFound)
}

func main() {
	http.HandleFunc("/tasks", handleTasks)
	http.HandleFunc("/tasks/", handleTasks)
	http.ListenAndServe(":8080", nil)
}
`

	testCases := []EvalTestCase{
		{
			Index:          1,
			Input:          "POST /tasks\n{\"title\":\"Build API\"}",
			ExpectedOutput: "201\n{\"id\":2,\"title\":\"Build API\",\"completed\":false}",
		},
		{
			Index:          2,
			Input:          "PATCH /tasks/1\n{\"completed\":true}",
			ExpectedOutput: "200\n{\"id\":1,\"title\":\"Learn Go\",\"completed\":true}",
		},
	}

	results, err := executeGo(code, testCases, false)
	if err != nil {
		t.Fatalf("executeGo failed: %v", err)
	}

	for _, res := range results {
		if !res.Passed {
			t.Errorf("Go test case %d failed: Expected: %q, Got: %q", res.Index, res.Expected, res.Actual)
		}
	}
}

func TestExecuteBackendJava(t *testing.T) {
	code := `import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public class Main {
    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        server.createContext("/tasks", Main::handleTasks);
        server.start();
    }

    private static void handleTasks(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();

        if ("POST".equalsIgnoreCase(method)) {
            String response = "{\"id\":2,\"title\":\"Build API\",\"completed\":false}";
            exchange.sendResponseHeaders(201, response.length());
            OutputStream os = exchange.getResponseBody();
            os.write(response.getBytes(StandardCharsets.UTF_8));
            exchange.close();
            return;
        }

        String response = "{\"error\":\"Not Found\"}";
        exchange.sendResponseHeaders(404, response.length());
        OutputStream os = exchange.getResponseBody();
        os.write(response.getBytes(StandardCharsets.UTF_8));
        exchange.close();
    }
}
`

	testCases := []EvalTestCase{
		{
			Index:          1,
			Input:          "POST /tasks\n{\"title\":\"Build API\"}",
			ExpectedOutput: "201\n{\"id\":2,\"title\":\"Build API\",\"completed\":false}",
		},
	}

	results, err := executeJava(code, testCases, false)
	if err != nil {
		t.Fatalf("executeJava failed: %v", err)
	}

	for _, res := range results {
		if !res.Passed {
			t.Errorf("Java test case %d failed: Expected: %q, Got: %q", res.Index, res.Expected, res.Actual)
		}
	}
}

