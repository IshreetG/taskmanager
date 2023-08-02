import { Component, OnInit } from '@angular/core';
import { TaskService } from '../../task.service';
import { ActivatedRoute, Params, Router} from '@angular/router';
import { Task } from '../../models/task.model';
import { List } from '../../models/list.model';


@Component({
  selector: 'app-task-view',
  templateUrl: './task-view.component.html',
  styleUrls: ['./task-view.component.scss']
})
export class TaskViewComponent implements OnInit{
  
  lists: List[]; //suppose to be any[]
  tasks: Task[];

  selectedListId: string;

  constructor(private taskService: TaskService, private route: ActivatedRoute, private router: Router){ }
  ngOnInit() {
    this.route.params.subscribe(
      (params: Params) => {

        if(params.listId) {
          this.selectedListId = params.listId;
          this.taskService.getTasks(params.listId).subscribe((tasks: any) =>{ //it was Task[]
          this.tasks = tasks;

        })
      }
      else {
        this.tasks = undefined!; //i added exlmation mark here 
      }

      }
    )
    
    this.taskService.getLists().subscribe((lists: any) => { //intiall there was List[]
      this.lists = lists;

    })
  }
  onTaskClick(task: Task) {
    //we want to set the task as completed 
    this.taskService.complete(task).subscribe(()=> {
      console.log("conpleted successfully");
      //then the task has been set to completed successfully 
      task.completed = !task.completed;

    })

  }

  onDeleteListClick(){
    this.taskService.deleteList(this.selectedListId).subscribe((res: any)=>{
      this.router.navigate(['/lists']);
      console.log(res);
    })
  }

  onDeleteTaskClick(id: string){
    this.taskService.deleteTask(this.selectedListId, id).subscribe((res: any)=>{
      this.tasks = this.tasks.filter(val => val._id !== id); //this will instantly delete the task from the list 
      console.log(res);
    })
  }


}
