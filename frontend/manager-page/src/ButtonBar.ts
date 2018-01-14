
import { VoidSyncEvent } from "ts-events-extended";

export type ButtonBarState= {
    isSimRowSelected: true;
    isSimSharable: boolean;
    areDetailsShown: boolean;
} | {
    isSimRowSelected: false;
    isSimSharable: false;
    areDetailsShown: false;
};

export class ButtonBar {

    public readonly structure: JQuery;

    public evtClickBack= new VoidSyncEvent();
    public evtClickDetail= new VoidSyncEvent();
    public evtClickDelete= new VoidSyncEvent();
    public evtClickShare= new VoidSyncEvent();
    public evtClickPhonebook= new VoidSyncEvent();
    public evtClickRename= new VoidSyncEvent();
    public evtClickRefresh= new VoidSyncEvent();

    private readonly buttons: JQuery;
    private readonly btnDetail: JQuery;
    private readonly btnBack: JQuery;
    private readonly btnDelete: JQuery;
    private readonly btnShare: JQuery;
    private readonly btnPhonebook: JQuery;
    private readonly btnRename: JQuery;
    private readonly btnReload: JQuery;

    public state: ButtonBarState;

    public setState(state: Partial<ButtonBarState>){

        for( let key in state ){
            this.state[key]= state[key];
        }

        this.buttons.removeClass("disabled");
        this.btnDetail.show();
        this.btnBack.show();

        if( !this.state.isSimRowSelected ){

            this.buttons.each( i=> {

                let button= $(this.buttons[i]);

                if( button.get(0) !== this.btnReload.get(0)){
                    button.addClass("disabled");
                }
            });

        }

        if( this.state.areDetailsShown ){
            this.btnDetail.hide();
        }else{
            this.btnBack.hide();
        }

        if( !this.state.isSimSharable ){
            this.btnShare.addClass("disabled");
        }


    }

    constructor() {

        this.structure= $(
            require("../templates/ButtonBar.html")
        );

        this.buttons= this.structure.find("button");

        this.btnDetail= $(this.buttons.get(0));
        this.btnBack= $(this.buttons.get(1));
        this.btnDelete= $(this.buttons.get(2));
        this.btnShare= $(this.buttons.get(3));
        this.btnPhonebook= $(this.buttons.get(4));
        this.btnRename= $(this.buttons.get(5));
        this.btnReload= $(this.buttons.get(6));

        this.btnDetail.click(
            ()=> {
                this.setState({ "areDetailsShown": true });
                this.evtClickDetail.post();
            }
        );

        this.btnBack.click(
            ()=> {
                this.setState({ "areDetailsShown": false });
                this.evtClickBack.post()
            }
        );

        this.btnDelete.click(
            ()=> this.evtClickDelete.post()
        );

        this.btnRename.click(
            ()=> this.evtClickRename.post()
        );

        this.btnReload.click(
            ()=> this.evtClickRefresh.post()
        );

        this.state= {
            "isSimRowSelected": false,
            "areDetailsShown": false,
            "isSimSharable": false
        };

        this.setState({});

    }

}