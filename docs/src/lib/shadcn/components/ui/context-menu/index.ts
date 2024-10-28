import { ContextMenu as ContextMenuPrimitive } from 'bits-ui'

import CheckboxItem from './context-menu-checkbox-item.svelte'
import Content from './context-menu-content.svelte'
import GroupHeading from './context-menu-group-heading.svelte'
import Item from './context-menu-item.svelte'
import RadioItem from './context-menu-radio-item.svelte'
import Separator from './context-menu-separator.svelte'
import Shortcut from './context-menu-shortcut.svelte'
import SubContent from './context-menu-sub-content.svelte'
import SubTrigger from './context-menu-sub-trigger.svelte'

const Sub = ContextMenuPrimitive.Sub
const Root = ContextMenuPrimitive.Root
const Trigger = ContextMenuPrimitive.Trigger
const Group = ContextMenuPrimitive.Group
const RadioGroup = ContextMenuPrimitive.RadioGroup

export {
    CheckboxItem,
    Content,
    //
    Root as ContextMenu,
    CheckboxItem as ContextMenuCheckboxItem,
    Content as ContextMenuContent,
    Group as ContextMenuGroup,
    GroupHeading as ContextMenuGroupHeading,
    Item as ContextMenuItem,
    RadioGroup as ContextMenuRadioGroup,
    RadioItem as ContextMenuRadioItem,
    Separator as ContextMenuSeparator,
    Shortcut as ContextMenuShortcut,
    Sub as ContextMenuSub,
    SubContent as ContextMenuSubContent,
    SubTrigger as ContextMenuSubTrigger,
    Trigger as ContextMenuTrigger,
    Group,
    GroupHeading,
    Item,
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
