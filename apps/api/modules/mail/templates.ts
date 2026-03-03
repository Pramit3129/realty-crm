import {basicTemplate} from './templates/template.basic';   

export class Templates{
    static getAllTemplates(){
        return [
            {
                type: "basic",
            }
        ]
    }
    static getTemplate(type: string, subject:string, body:string){
        switch(type){
            case "basic":
                return basicTemplate(subject, body);
            default:
                return basicTemplate(subject, body);
        }
    }
}