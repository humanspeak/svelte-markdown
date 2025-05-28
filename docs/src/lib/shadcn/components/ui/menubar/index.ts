import { Menubar as MenubarPrimitive } from 'bits-ui'
import CheckboxItem from './menubar-checkbox-item.svelte'
import Content from './menubar-content.svelte'
import GroupHeading from './menubar-group-heading.svelte'
import Group from './menubar-group.svelte'
import Item from './menubar-item.svelte'
import Label from './menubar-label.svelte'
import RadioItem from './menubar-radio-item.svelte'
import Separator from './menubar-separator.svelte'
import Shortcut from './menubar-shortcut.svelte'
import SubContent from './menubar-sub-content.svelte'
import SubTrigger from './menubar-sub-trigger.svelte'
import Trigger from './menubar-trigger.svelte'
import Root from './menubar.svelte'

const Menu = MenubarPrimitive.Menu
const Sub = MenubarPrimitive.Sub
const RadioGroup = MenubarPrimitive.RadioGroup

export {
    CheckboxItem,
    Content,
    Group,
    GroupHeading,
    Item,
    Label,
    Menu,
    //
    Root as Menubar,
    CheckboxItem as MenubarCheckboxItem,
    Content as MenubarContent,
    Group as MenubarGroup,
    GroupHeading as MenubarGroupHeading,
    Item as MenubarItem,
    Label as MenubarLabel,
    Menu as MenubarMenu,
    RadioGroup as MenubarRadioGroup,
    RadioItem as MenubarRadioItem,
    Separator as MenubarSeparator,
    Shortcut as MenubarShortcut,
    Sub as MenubarSub,
    SubContent as MenubarSubContent,
    SubTrigger as MenubarSubTrigger,
    Trigger as MenubarTrigger,
    RadioGroup,
    RadioItem,
    Root,
    Separator,
    Shortcut,
    Sub,
    SubContent,
    SubTrigger,
    Trigger
}
