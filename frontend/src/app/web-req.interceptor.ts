import { HttpErrorResponse, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, empty, throwError, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { catchError, switchMap, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class WebReqInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) { }
  
  refreshingAccessToken: boolean;
  
  accessTokenRefreshed: Subject<any> = new Subject();

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<any> {
    //handle the request 
    request = this.addAuthHeader(request);

    //call next and handle the response 
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) =>{
        console.log(error);
        if(error.status === 401){
          //if there is 401 error we are unautheorizied 
          //refresh the access token then if that fails we logout 

          return this.refreshAccessToken().pipe(
            switchMap(()=>{
              request = this.addAuthHeader(request);
              return next.handle(request);
            }),
            catchError((err:any)=>{
              console.log(err);
              this.authService.logout();
              return empty();
            })
          )
        }

        return throwError(()=> error); //this was suppose to be just (error)
      })
    )   
  }
  refreshAccessToken(){
    if(this.refreshingAccessToken){
      return new Observable(observer =>{
        this.accessTokenRefreshed.subscribe(()=>{
          //this code will run when the access token has been refreshed 
          observer.next();
          observer.complete();
        })
      })
      
    } 
    else {
      this.refreshingAccessToken = true;
      //we want to call a method in auth service to send a request to refresh the access token
      return this.authService.getNewAccessToken().pipe(
        tap(()=>{
          this.refreshingAccessToken = false;
          console.log("access token has been refreshed");
          this.accessTokenRefreshed.next(void 0);
        })
      )

    }
   
  }
  addAuthHeader(request: HttpRequest<any>){
    //get the access token
    const token = this.authService.getAccessToken();
    if(token){
       //append the access token to the request handler 
       return request.clone({
        setHeaders:{
        'x-access-token':token
         }

       })
    }
    return request; 

  }
}
